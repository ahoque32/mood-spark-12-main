import { NextRequest, NextResponse } from 'next/server';
import GoogleCalendarService from '@/lib/services/google-calendar';
import { authMiddleware } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?calendar_error=${error}`);
    }

    if (!code) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?calendar_error=no_code`);
    }

    // Get authenticated user (optional for calendar integration)
    const authResult = await authMiddleware(request);
    const userId = authResult?.userId || null;

    const calendarService = new GoogleCalendarService();
    const success = await calendarService.authenticate(code, userId);

    if (success) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?calendar_success=true`);
    } else {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?calendar_error=auth_failed`);
    }
  } catch (error) {
    console.error('Google Calendar OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?calendar_error=server_error`);
  }
}