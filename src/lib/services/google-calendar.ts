/**
 * Google Calendar Integration Service
 * Provides OAuth2 authentication and real calendar data access
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  duration: number;
  attendees: number;
  location?: string;
  isRecurring: boolean;
  meetingUrl?: string;
  organizer: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  type: 'meeting' | 'focus_time' | 'personal' | 'break' | 'unknown';
}

export interface CalendarStats {
  totalEvents: number;
  meetingCount: number;
  focusBlocks: number;
  totalMeetingTime: number;
  averageMeetingDuration: number;
  backToBackMeetings: number;
  busyHours: number;
  freeHours: number;
  calendarUtilization: number;
}

class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private isAuthenticated: boolean = false;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Generate OAuth2 authorization URL
   */
  public getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  public async authenticate(code: string, userId?: string): Promise<boolean> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;

      // Store tokens securely in database
      if (userId) {
        await this.storeTokens(tokens, userId);
      }

      return true;
    } catch (error) {
      console.error('Google Calendar authentication failed:', error);
      return false;
    }
  }

  /**
   * Load stored tokens
   */
  public async loadStoredTokens(userId: string): Promise<boolean> {
    try {
      // Implement token retrieval from your secure storage
      const tokens = await this.getStoredTokens(userId);
      
      if (tokens) {
        this.oauth2Client.setCredentials(tokens);
        this.isAuthenticated = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
      return false;
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(userId?: string): Promise<boolean> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);
      
      if (userId) {
        await this.storeTokens(credentials, userId);
      }
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Get calendar events for a date range
   */
  public async getEvents(
    startDate: Date = new Date(),
    endDate: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    calendarId: string = 'primary'
  ): Promise<CalendarEvent[]> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Google Calendar');
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250
      });

      const events = response.data.items || [];
      return events.map((event: any) => this.parseGoogleEvent(event));
    } catch (error) {
      if (error.code === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.getEvents(startDate, endDate, calendarId);
        }
      }
      throw error;
    }
  }

  /**
   * Get today's events
   */
  public async getTodayEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getEvents(today, tomorrow);
  }

  /**
   * Get upcoming events (next 2 hours)
   */
  public async getUpcomingEvents(): Promise<CalendarEvent[]> {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return this.getEvents(now, twoHoursLater);
  }

  /**
   * Get calendar statistics
   */
  public async getCalendarStats(days: number = 7): Promise<CalendarStats> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const events = await this.getEvents(startDate, endDate);
    
    return this.calculateStats(events, days);
  }

  /**
   * Parse Google Calendar event to our format
   */
  private parseGoogleEvent(event: any): CalendarEvent {
    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

    // Determine event type based on content
    const title = event.summary || 'Untitled Event';
    const description = event.description || '';
    const attendeeCount = event.attendees?.length || 0;

    let type: CalendarEvent['type'] = 'unknown';
    
    // Smart categorization
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    
    if (titleLower.includes('focus') || titleLower.includes('deep work') || 
        titleLower.includes('coding') || titleLower.includes('development')) {
      type = 'focus_time';
    } else if (titleLower.includes('break') || titleLower.includes('lunch') || 
               titleLower.includes('coffee')) {
      type = 'break';
    } else if (titleLower.includes('personal') || titleLower.includes('doctor') || 
               titleLower.includes('appointment') && attendeeCount <= 1) {
      type = 'personal';
    } else if (attendeeCount > 1 || titleLower.includes('meeting') || 
               titleLower.includes('standup') || titleLower.includes('sync') ||
               titleLower.includes('call') || titleLower.includes('review')) {
      type = 'meeting';
    } else if (attendeeCount <= 1) {
      type = 'focus_time';
    } else {
      type = 'meeting';
    }

    // Extract meeting URL
    let meetingUrl = '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = description.match(urlRegex);
    if (urls) {
      meetingUrl = urls.find(url => 
        url.includes('zoom.us') || 
        url.includes('teams.microsoft.com') || 
        url.includes('meet.google.com') ||
        url.includes('webex.com')
      ) || '';
    }

    return {
      id: event.id,
      title,
      description,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      duration,
      attendees: attendeeCount,
      location: event.location,
      isRecurring: !!event.recurringEventId,
      meetingUrl,
      organizer: event.organizer?.email || '',
      status: event.status as CalendarEvent['status'],
      type
    };
  }

  /**
   * Calculate calendar statistics
   */
  private calculateStats(events: CalendarEvent[], days: number): CalendarStats {
    const meetings = events.filter(e => e.type === 'meeting');
    const focusBlocks = events.filter(e => e.type === 'focus_time');
    
    const totalMeetingTime = meetings.reduce((sum, m) => sum + m.duration, 0);
    const totalEventTime = events.reduce((sum, e) => sum + e.duration, 0);
    
    // Calculate back-to-back meetings
    const sortedMeetings = meetings.sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    
    let backToBackCount = 0;
    for (let i = 1; i < sortedMeetings.length; i++) {
      const prevEnd = new Date(sortedMeetings[i-1].end);
      const currentStart = new Date(sortedMeetings[i].start);
      const gap = currentStart.getTime() - prevEnd.getTime();
      
      if (gap <= 15 * 60 * 1000) { // 15 minutes or less
        backToBackCount++;
      }
    }

    const workHoursPerDay = 8; // Assume 8-hour workday
    const totalWorkHours = days * workHoursPerDay;
    const busyHours = Math.round(totalEventTime / 60);
    const freeHours = Math.max(0, totalWorkHours - busyHours);

    return {
      totalEvents: events.length,
      meetingCount: meetings.length,
      focusBlocks: focusBlocks.length,
      totalMeetingTime,
      averageMeetingDuration: meetings.length > 0 ? 
        Math.round(totalMeetingTime / meetings.length) : 0,
      backToBackMeetings: backToBackCount,
      busyHours,
      freeHours,
      calendarUtilization: Math.round((busyHours / totalWorkHours) * 100)
    };
  }

  /**
   * Store tokens securely in database
   */
  private async storeTokens(tokens: any, userId?: string): Promise<void> {
    if (!userId) {
      console.warn('Cannot store tokens without userId');
      return;
    }

    try {
      const { CalendarQueries } = await import('@/lib/queries/calendar-queries');
      await CalendarQueries.storeTokens(userId, 'google', tokens);
    } catch (error) {
      console.error('Failed to store Google Calendar tokens:', error);
      throw error;
    }
  }

  /**
   * Retrieve stored tokens from database
   */
  private async getStoredTokens(userId: string): Promise<any> {
    try {
      const { CalendarQueries } = await import('@/lib/queries/calendar-queries');
      const tokenData = await CalendarQueries.getTokens(userId, 'google');
      
      if (!tokenData) return null;

      return {
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken,
        expiry_date: tokenData.expiryDate,
        scope: tokenData.scope
      };
    } catch (error) {
      console.error('Failed to retrieve stored tokens:', error);
      return null;
    }
  }

  /**
   * Check if service is authenticated
   */
  public isAuth(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get current authentication status
   */
  public getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      hasTokens: !!this.oauth2Client.credentials?.access_token,
      tokenExpiry: this.oauth2Client.credentials?.expiry_date
    };
  }
}

export default GoogleCalendarService;