import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isGoogleConfigured } from '@/lib/google/auth';

export async function GET() {
  try {
    const isConfigured = isGoogleConfigured();

    if (!isConfigured) {
      return NextResponse.json({
        configured: false,
        connected: false,
        message: 'Google Calendar not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables.',
      });
    }

    // Get user
    const user = await db.user.findFirst();

    if (!user) {
      return NextResponse.json({
        configured: true,
        connected: false,
      });
    }

    // Check for Google tokens
    const syncToken = await db.syncToken.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'google-calendar',
        },
      },
    });

    if (!syncToken) {
      return NextResponse.json({
        configured: true,
        connected: false,
      });
    }

    // Check if token is expired
    const isExpired = syncToken.expiresAt < new Date();

    return NextResponse.json({
      configured: true,
      connected: true,
      expired: isExpired,
      expiresAt: syncToken.expiresAt,
      connectedAt: syncToken.createdAt,
    });
  } catch (error) {
    console.error('Google status error:', error);
    return NextResponse.json(
      { error: 'Failed to check Google Calendar status' },
      { status: 500 }
    );
  }
}
