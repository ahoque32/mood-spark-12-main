/**
 * Calendar Integration Service
 * Tracks calendar events and meeting patterns for mood correlation
 */

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  duration: number; // minutes
  attendees?: number;
  type: 'meeting' | 'focus_time' | 'personal' | 'break' | 'unknown';
  isRecurring: boolean;
  location?: string;
  description?: string;
}

interface CalendarMetrics {
  meetingCount: number;
  meetingDuration: number; // total minutes in meetings
  focusTimeBlocks: number;
  backToBackMeetings: number;
  meetingDensity: number; // meetings per hour
  averageMeetingDuration: number;
  largestMeetingSize: number;
  personalTimeRatio: number;
  calendarUtilization: number; // percentage of work day scheduled
}

class CalendarTracker {
  private events: CalendarEvent[] = [];
  private isConnected: boolean = false;
  private provider: 'google' | 'outlook' | 'apple' | null = null;
  private lastSync: number = 0;

  /**
   * Initialize calendar integration
   */
  public async initialize(): Promise<void> {
    // Try to detect and connect to available calendar services
    await this.detectCalendarProviders();
    
    if (this.isConnected) {
      // Initial sync
      await this.syncEvents();
      
      // Set up periodic sync
      setInterval(() => {
        this.syncEvents();
      }, 15 * 60 * 1000); // Sync every 15 minutes
      
      console.log('Calendar tracking initialized');
    } else {
      // Fallback to browser-based calendar detection
      this.initializeBrowserCalendarDetection();
    }
  }

  /**
   * Detect available calendar providers
   */
  private async detectCalendarProviders(): Promise<void> {
    // Check for Google Calendar integration
    if (await this.checkGoogleCalendar()) {
      this.provider = 'google';
      this.isConnected = true;
      return;
    }

    // Check for Microsoft Outlook integration
    if (await this.checkOutlookCalendar()) {
      this.provider = 'outlook';
      this.isConnected = true;
      return;
    }

    // Check for Apple Calendar (limited web access)
    if (await this.checkAppleCalendar()) {
      this.provider = 'apple';
      this.isConnected = true;
      return;
    }

    console.log('No calendar provider detected, using browser-based detection');
  }

  /**
   * Check Google Calendar availability
   */
  private async checkGoogleCalendar(): Promise<boolean> {
    try {
      // Check if user has granted Google Calendar permission
      // This would typically involve OAuth2 flow
      
      // For now, return false - would need proper OAuth implementation
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check Outlook Calendar availability
   */
  private async checkOutlookCalendar(): Promise<boolean> {
    try {
      // Check Microsoft Graph API access
      // Would need proper OAuth2 implementation
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check Apple Calendar availability
   */
  private async checkAppleCalendar(): Promise<boolean> {
    try {
      // Apple Calendar has very limited web API access
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize browser-based calendar detection
   */
  private initializeBrowserCalendarDetection(): void {
    // Detect calendar usage patterns from browser behavior
    this.detectCalendarWebApps();
    this.detectMeetingPatterns();
    this.detectSchedulingBehavior();
  }

  /**
   * Detect calendar web applications
   */
  private detectCalendarWebApps(): void {
    const calendarDomains = [
      'calendar.google.com',
      'outlook.live.com',
      'outlook.office.com',
      'calendly.com',
      'when2meet.com',
      'doodle.com'
    ];

    // Monitor page navigation to calendar sites
    const currentDomain = window.location.hostname;
    if (calendarDomains.some(domain => currentDomain.includes(domain))) {
      this.trackCalendarWebAppUsage();
    }

    // Monitor window titles for calendar keywords
    this.monitorWindowTitles();
  }

  /**
   * Track calendar web app usage
   */
  private trackCalendarWebAppUsage(): void {
    const domain = window.location.hostname;
    
    // Track time spent on calendar
    let startTime = Date.now();
    
    window.addEventListener('beforeunload', () => {
      const duration = Date.now() - startTime;
      this.logCalendarActivity('calendar_usage', {
        domain,
        duration,
        url: window.location.pathname
      });
    });

    // Track calendar interactions
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // Detect meeting creation/editing
      if (target.textContent?.includes('meeting') || 
          target.textContent?.includes('event') ||
          target.className?.includes('calendar')) {
        this.logCalendarActivity('calendar_interaction', {
          action: 'click',
          element: target.tagName,
          text: target.textContent?.substring(0, 50)
        });
      }
    });

    // Monitor for calendar-specific elements
    this.monitorCalendarElements();
  }

  /**
   * Monitor window titles for calendar activity
   */
  private monitorWindowTitles(): void {
    let lastTitle = document.title;
    
    const checkTitle = () => {
      if (document.title !== lastTitle) {
        // Detect meeting/event keywords in title
        const meetingKeywords = ['meeting', 'call', 'standup', '1:1', 'sync', 'review', 'interview'];
        const timeKeywords = ['pm', 'am', ':', 'mins', 'hour'];
        
        const hasMeetingKeyword = meetingKeywords.some(keyword => 
          document.title.toLowerCase().includes(keyword));
        const hasTimeKeyword = timeKeywords.some(keyword => 
          document.title.toLowerCase().includes(keyword));
        
        if (hasMeetingKeyword && hasTimeKeyword) {
          this.inferMeetingFromTitle(document.title);
        }
        
        lastTitle = document.title;
      }
    };

    setInterval(checkTitle, 5000); // Check every 5 seconds
  }

  /**
   * Monitor calendar-specific DOM elements
   */
  private monitorCalendarElements(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              // Look for calendar event elements
              const eventElements = node.querySelectorAll('[data-event], .calendar-event, .fc-event');
              if (eventElements.length > 0) {
                this.extractEventsFromDOM(eventElements);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Detect meeting patterns from browser behavior
   */
  private detectMeetingPatterns(): void {
    // Monitor for video conferencing sites
    const meetingDomains = [
      'zoom.us',
      'teams.microsoft.com',
      'meet.google.com',
      'webex.com',
      'gotomeeting.com'
    ];

    if (meetingDomains.some(domain => window.location.hostname.includes(domain))) {
      this.trackMeetingSession();
    }
  }

  /**
   * Track meeting session
   */
  private trackMeetingSession(): void {
    const startTime = Date.now();
    const platform = this.detectMeetingPlatform();
    
    this.logCalendarActivity('meeting_start', {
      platform,
      startTime: new Date(startTime).toISOString()
    });

    // Detect meeting end
    window.addEventListener('beforeunload', () => {
      const duration = Date.now() - startTime;
      this.logCalendarActivity('meeting_end', {
        platform,
        duration,
        endTime: new Date().toISOString()
      });
    });

    // Monitor for meeting controls (mute, camera, etc.)
    this.monitorMeetingControls();
  }

  /**
   * Detect meeting platform
   */
  private detectMeetingPlatform(): string {
    const hostname = window.location.hostname;
    if (hostname.includes('zoom.us')) return 'zoom';
    if (hostname.includes('teams.microsoft.com')) return 'teams';
    if (hostname.includes('meet.google.com')) return 'google_meet';
    if (hostname.includes('webex.com')) return 'webex';
    if (hostname.includes('gotomeeting.com')) return 'gotomeeting';
    return 'unknown';
  }

  /**
   * Monitor meeting controls
   */
  private monitorMeetingControls(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const text = target.textContent?.toLowerCase() || '';
      const ariaLabel = target.getAttribute('aria-label')?.toLowerCase() || '';
      
      // Detect mute/unmute actions
      if (text.includes('mute') || ariaLabel.includes('mute')) {
        this.logCalendarActivity('meeting_interaction', {
          action: 'mute_toggle',
          timestamp: Date.now()
        });
      }
      
      // Detect camera toggle
      if (text.includes('camera') || text.includes('video') || ariaLabel.includes('camera')) {
        this.logCalendarActivity('meeting_interaction', {
          action: 'camera_toggle',
          timestamp: Date.now()
        });
      }
      
      // Detect screen sharing
      if (text.includes('share') && text.includes('screen')) {
        this.logCalendarActivity('meeting_interaction', {
          action: 'screen_share',
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Detect scheduling behavior
   */
  private detectSchedulingBehavior(): void {
    // Monitor for scheduling-related form inputs
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      
      if (target.type === 'time' || target.type === 'datetime-local' ||
          target.name?.includes('time') || target.name?.includes('date')) {
        this.logCalendarActivity('scheduling_input', {
          inputType: target.type,
          name: target.name,
          value: target.value?.substring(0, 10) // Don't log actual times for privacy
        });
      }
    });
  }

  /**
   * Infer meeting from window title
   */
  private inferMeetingFromTitle(title: string): void {
    // Extract potential meeting info from title
    const timeRegex = /(\d{1,2}):(\d{2})\s*(am|pm)/gi;
    const timeMatches = title.match(timeRegex);
    
    if (timeMatches) {
      this.logCalendarActivity('meeting_detected', {
        title: title.substring(0, 50), // Truncate for privacy
        timeIndicators: timeMatches.length,
        source: 'window_title'
      });
    }
  }

  /**
   * Extract events from DOM elements
   */
  private extractEventsFromDOM(elements: NodeListOf<Element>): void {
    elements.forEach((element) => {
      const text = element.textContent || '';
      const timePattern = /\d{1,2}:\d{2}/;
      
      if (timePattern.test(text)) {
        this.logCalendarActivity('event_detected', {
          text: text.substring(0, 50),
          source: 'dom_element',
          elementType: element.tagName
        });
      }
    });
  }

  /**
   * Sync events from calendar provider
   */
  private async syncEvents(): Promise<void> {
    if (!this.isConnected || !this.provider) return;

    try {
      // This would implement actual API calls to calendar providers
      // For now, we'll simulate with placeholder data
      
      this.lastSync = Date.now();
      console.log(`Calendar synced from ${this.provider}`);
    } catch (error) {
      console.error('Calendar sync failed:', error);
    }
  }

  /**
   * Generate calendar metrics
   */
  public getMetrics(): CalendarMetrics {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Filter today's events
    const todayEvents = this.events.filter(event => 
      new Date(event.start).getTime() >= todayStart.getTime() &&
      new Date(event.start).getTime() < now
    );

    const meetings = todayEvents.filter(event => event.type === 'meeting');
    const totalMeetingDuration = meetings.reduce((sum, meeting) => sum + meeting.duration, 0);
    
    // Calculate back-to-back meetings
    let backToBackCount = 0;
    for (let i = 1; i < meetings.length; i++) {
      const prevEnd = new Date(meetings[i-1].end).getTime();
      const currentStart = new Date(meetings[i].start).getTime();
      if (currentStart - prevEnd < 15 * 60 * 1000) { // Less than 15 min gap
        backToBackCount++;
      }
    }

    const workDayDuration = 8 * 60; // 8 hours in minutes
    const scheduledTime = todayEvents.reduce((sum, event) => sum + event.duration, 0);

    return {
      meetingCount: meetings.length,
      meetingDuration: totalMeetingDuration,
      focusTimeBlocks: todayEvents.filter(e => e.type === 'focus_time').length,
      backToBackMeetings: backToBackCount,
      meetingDensity: meetings.length / 8, // per work hour
      averageMeetingDuration: meetings.length > 0 ? totalMeetingDuration / meetings.length : 0,
      largestMeetingSize: Math.max(...meetings.map(m => m.attendees || 1), 0),
      personalTimeRatio: todayEvents.filter(e => e.type === 'personal').length / todayEvents.length || 0,
      calendarUtilization: Math.min(scheduledTime / workDayDuration * 100, 100)
    };
  }

  /**
   * Log calendar activity
   */
  private async logCalendarActivity(type: string, data: any): Promise<void> {
    const activity = {
      type: `calendar_${type}`,
      timestamp: Date.now(),
      data,
      source: 'calendar_tracker'
    };

    // Send to tracking API
    try {
      await fetch('/api/tracking/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activity)
      });
    } catch (error) {
      console.error('Failed to log calendar activity:', error);
    }
  }

  /**
   * Get current calendar status
   */
  public getStatus() {
    return {
      isConnected: this.isConnected,
      provider: this.provider,
      lastSync: this.lastSync,
      eventCount: this.events.length
    };
  }
}

// Export singleton instance
let calendarTracker: CalendarTracker | null = null;

export const getCalendarTracker = (): CalendarTracker => {
  if (!calendarTracker && typeof window !== 'undefined') {
    calendarTracker = new CalendarTracker();
  }
  return calendarTracker!;
};

export default CalendarTracker;
export type { CalendarEvent, CalendarMetrics };