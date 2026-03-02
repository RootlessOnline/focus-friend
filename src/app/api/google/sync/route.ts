import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClient, refreshAccessToken } from '@/lib/google/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get user
    let user = await db.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 });
    }

    // Get Google tokens
    const syncToken = await db.syncToken.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'google-calendar',
        },
      },
    });

    if (!syncToken) {
      return NextResponse.json(
        { error: 'Google Calendar not connected' },
        { status: 400 }
      );
    }

    let accessToken = syncToken.accessToken;
    let refreshToken = syncToken.refreshToken;

    // Check if token needs refresh
    if (syncToken.expiresAt < new Date()) {
      const newTokens = await refreshAccessToken(refreshToken);
      if (!newTokens) {
        // Token refresh failed, user needs to re-authenticate
        await db.syncToken.delete({
          where: { id: syncToken.id },
        });
        return NextResponse.json(
          { error: 'Google token expired. Please reconnect.' },
          { status: 401 }
        );
      }

      accessToken = newTokens.accessToken;

      // Update stored tokens
      await db.syncToken.update({
        where: { id: syncToken.id },
        data: {
          accessToken: newTokens.accessToken,
          expiresAt: newTokens.expiresAt,
        },
      });
    }

    // Get Calendar client
    const calendar = getCalendarClient(accessToken, refreshToken);

    // Fetch events from Google Calendar
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ahead

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    const googleEvents = response.data.items || [];
    let imported = 0;
    let updated = 0;

    // Sync events to database
    for (const gEvent of googleEvents) {
      if (!gEvent.id || !gEvent.summary) continue;

      // Check if event already exists (by Google event ID stored in description or a custom field)
      const existingEvent = await db.event.findFirst({
        where: {
          userId: user.id,
          description: { contains: `[google-id:${gEvent.id}]` },
        },
      });

      const startDate = gEvent.start?.dateTime || gEvent.start?.date;
      const endDate = gEvent.end?.dateTime || gEvent.end?.date;

      if (!startDate) continue;

      const eventData = {
        title: gEvent.summary || 'Untitled Event',
        description: (gEvent.description || '') + `\n[google-id:${gEvent.id}]`,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        isAllDay: !gEvent.start?.dateTime,
        location: gEvent.location || undefined,
        status: gEvent.status === 'confirmed' ? 'confirmed' : gEvent.status === 'tentative' ? 'tentative' : 'confirmed',
        userId: user.id,
      };

      if (existingEvent) {
        await db.event.update({
          where: { id: existingEvent.id },
          data: eventData,
        });
        updated++;
      } else {
        await db.event.create({
          data: eventData,
        });
        imported++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      total: googleEvents.length,
    });
  } catch (error) {
    console.error('Google sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Google Calendar' },
      { status: 500 }
    );
  }
}
