import { google } from 'googleapis';

// Google OAuth2 configuration
// You need to get these from Google Cloud Console:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select existing one
// 3. Enable Google Calendar API
// 4. Go to APIs & Services > Credentials
// 5. Create OAuth 2.0 Client ID (Web application)
// 6. Add authorized redirect URI: http://localhost:3000/api/google/callback
// 7. Copy Client ID and Client Secret

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

// Scopes needed for Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

// Create OAuth2 client
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

// Generate auth URL for user to authorize
export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Need offline access for refresh token
    scope: SCOPES,
    state: state, // For CSRF protection
    prompt: 'consent', // Force consent screen to get refresh token
  });
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Create authenticated Google Calendar client
export function getCalendarClient(accessToken: string, refreshToken: string) {
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Refresh access token if expired
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (credentials.access_token && credentials.expiry_date) {
      return {
        accessToken: credentials.access_token,
        expiresAt: new Date(credentials.expiry_date),
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    return null;
  }
}

// Check if configuration is valid
export function isGoogleConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export { SCOPES };
