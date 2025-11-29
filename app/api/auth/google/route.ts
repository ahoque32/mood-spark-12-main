import { NextRequest, NextResponse } from 'next/server';
import GoogleCalendarService from '@/lib/services/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const calendarService = new GoogleCalendarService();
    const authUrl = calendarService.getAuthUrl();

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google Calendar auth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar authentication' },
      { status: 500 }
    );
  }
}