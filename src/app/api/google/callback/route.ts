import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/google/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL('/?google_error=' + encodeURIComponent(error), request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?google_error=' + encodeURIComponent('No authorization code received'), request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/?google_error=' + encodeURIComponent('Failed to get tokens'), request.url)
      );
    }

    // Get or create user (for demo, we'll use a single user)
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: {
          email: 'demo@focusfriend.app',
          name: 'Demo User',
          displayName: 'Gamer',
        },
      });
    }

    // Calculate token expiration
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    // Store tokens in database
    await db.syncToken.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'google-calendar',
        },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
      create: {
        userId: user.id,
        provider: 'google-calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
    });

    // Redirect back to app with success message
    return NextResponse.redirect(
      new URL('/?google_success=true', request.url)
    );
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(
      new URL('/?google_error=' + encodeURIComponent('Failed to complete Google connection'), request.url)
    );
  }
}
