import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl, isGoogleConfigured } from '@/lib/google/auth';
import { randomBytes } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Check if Google is configured
    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: 'Google Calendar not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.' },
        { status: 500 }
      );
    }

    // Generate a random state for CSRF protection
    const state = randomBytes(16).toString('hex');

    // In production, you'd store this state in session/cookie
    // For now, we'll use a simple approach

    const authUrl = getAuthUrl(state);

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google connection' },
      { status: 500 }
    );
  }
}
