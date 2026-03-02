import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Get user
    const user = await db.user.findFirst();

    if (!user) {
      return NextResponse.json({ error: 'No user found' }, { status: 404 });
    }

    // Delete Google tokens
    await db.syncToken.deleteMany({
      where: {
        userId: user.id,
        provider: 'google-calendar',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Google Calendar disconnected',
    });
  } catch (error) {
    console.error('Google disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    );
  }
}
