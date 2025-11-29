import { NextRequest, NextResponse } from 'next/server';
import GoogleCalendarService from '@/lib/services/google-calendar';
import { authMiddleware } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await authMiddleware(request);
    if (!authResult?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const startDate = searchParams.get('startDate') ? 
      new Date(searchParams.get('startDate')!) : 
      new Date();
    const endDate = searchParams.get('endDate') ? 
      new Date(searchParams.get('endDate')!) : 
      new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const calendarService = new GoogleCalendarService();
    
    // Load stored tokens for user
    const tokensLoaded = await calendarService.loadStoredTokens(authResult.userId);
    if (!tokensLoaded) {
      return NextResponse.json(
        { error: 'Calendar not connected. Please authenticate first.' },
        { status: 401 }
      );
    }

    const events = await calendarService.getEvents(startDate, endDate);
    const stats = await calendarService.getCalendarStats(days);

    return NextResponse.json({
      success: true,
      events,
      stats,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });

  } catch (error) {
    console.error('Calendar events API error:', error);
    
    if (error.code === 401) {
      return NextResponse.json(
        { error: 'Calendar authentication expired. Please reconnect.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await authMiddleware(request);
    if (!authResult?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    const calendarService = new GoogleCalendarService();

    if (action === 'connect') {
      const authUrl = calendarService.getAuthUrl();
      return NextResponse.json({
        success: true,
        authUrl
      });
    }

    if (action === 'status') {
      const tokensLoaded = await calendarService.loadStoredTokens(authResult.userId);
      const status = calendarService.getAuthStatus();
      
      return NextResponse.json({
        success: true,
        isConnected: tokensLoaded,
        status
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: 'Calendar API request failed' },
      { status: 500 }
    );
  }
}