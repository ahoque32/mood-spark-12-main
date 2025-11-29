/**
 * Browser Activity Tracker
 * Collects browser-based user behavior metrics for mood correlation
 */

interface BrowserActivity {
  type: string;
  timestamp: number;
  data: any;
  sessionId: string;
  userId?: string;
}

interface BrowserMetrics {
  tabCount: number;
  activeTime: number;
  idleTime: number;
  scrollSpeed: number;
  clickRate: number;
  keyboardActivity: number;
  focusChanges: number;
  pageVisits: number;
  formInteractions: number;
  mediaConsumption: number;
}

class BrowserTracker {
  private activities: BrowserActivity[] = [];
  private sessionId: string;
  private userId?: string;
  private startTime: number;
  private lastActivity: number;
  private idleTimer: NodeJS.Timeout | null = null;
  private metrics: BrowserMetrics;
  private isTracking: boolean = false;
  private flushInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  private readonly FLUSH_INTERVAL = 30 * 1000; // 30 seconds
  private readonly MAX_BUFFER_SIZE = 100;
  
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.lastActivity = Date.now();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize tracking with user consent
   */
  public async initialize(userId?: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    this.userId = userId;
    
    // Check for user consent
    const consent = await this.checkUserConsent();
    if (!consent) {
      console.log('Browser tracking disabled - no user consent');
      return;
    }

    this.startTracking();
  }

  /**
   * Start tracking browser activities
   */
  private startTracking(): void {
    if (this.isTracking) return;
    this.isTracking = true;

    // Page visibility tracking
    this.trackPageVisibility();
    
    // Tab/window focus tracking
    this.trackWindowFocus();
    
    // User interaction tracking
    this.trackUserInteractions();
    
    // Performance metrics
    this.trackPerformanceMetrics();
    
    // Scroll behavior
    this.trackScrollBehavior();
    
    // Network activity
    this.trackNetworkActivity();
    
    // Media consumption
    this.trackMediaConsumption();
    
    // Start periodic flush to API
    this.startPeriodicFlush();
    
    // Track page unload
    this.trackPageUnload();

    console.log('Browser tracking initialized');
  }

  /**
   * Track page visibility changes
   */
  private trackPageVisibility(): void {
    document.addEventListener('visibilitychange', () => {
      const isVisible = !document.hidden;
      this.logActivity('visibility_change', {
        visible: isVisible,
        hiddenDuration: isVisible ? Date.now() - this.lastActivity : 0
      });

      if (isVisible) {
        this.handleUserActivity();
      }
    });
  }

  /**
   * Track window focus/blur events
   */
  private trackWindowFocus(): void {
    window.addEventListener('focus', () => {
      this.logActivity('window_focus', {
        awayDuration: Date.now() - this.lastActivity
      });
      this.metrics.focusChanges++;
      this.handleUserActivity();
    });

    window.addEventListener('blur', () => {
      this.logActivity('window_blur', {});
    });

    // Track tab visibility changes (Page Visibility API)
    document.addEventListener('visibilitychange', () => {
      const isVisible = !document.hidden;
      this.logActivity('tab_visibility_change', {
        visible: isVisible,
        visibilityState: document.visibilityState
      });
    });

    // Estimate tab count using service worker (if available)
    if ('serviceWorker' in navigator) {
      this.trackTabCountWithServiceWorker();
    } else {
      // Fallback: Use performance navigation API to detect new tabs
      this.trackTabCountFallback();
    }
  }

  private trackTabCountWithServiceWorker(): void {
    // Register a simple service worker to count tabs
    navigator.serviceWorker.register('/sw-tab-counter.js').catch(() => {
      // Service worker not available, use fallback
      this.trackTabCountFallback();
    });
  }

  private trackTabCountFallback(): void {
    // Use BroadcastChannel to communicate between tabs
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('mood_spark_tabs');
      
      // Send ping to other tabs
      channel.postMessage({ type: 'ping', tabId: this.sessionId });
      
      let tabCount = 1;
      const tabIds = new Set([this.sessionId]);
      
      channel.addEventListener('message', (event) => {
        if (event.data.type === 'ping' && event.data.tabId !== this.sessionId) {
          tabIds.add(event.data.tabId);
          tabCount = tabIds.size;
          this.metrics.tabCount = tabCount;
          
          // Respond to ping
          channel.postMessage({ type: 'pong', tabId: this.sessionId });
        } else if (event.data.type === 'pong' && event.data.tabId !== this.sessionId) {
          tabIds.add(event.data.tabId);
          tabCount = tabIds.size;
          this.metrics.tabCount = tabCount;
        }
      });

      // Periodic ping to maintain tab count
      setInterval(() => {
        channel.postMessage({ type: 'ping', tabId: this.sessionId });
      }, 30000); // Every 30 seconds

    } else {
      // Final fallback: estimate from navigation timing
      this.estimateTabCountFromTiming();
    }
  }

  private estimateTabCountFromTiming(): void {
    // Simple heuristic based on navigation timing
    const timing = performance.timing;
    if (timing.navigationStart && timing.loadEventEnd) {
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      // Estimate: slower loads often mean more tabs/resource contention
      const estimatedTabs = Math.min(Math.max(Math.floor(loadTime / 1000), 1), 10);
      this.metrics.tabCount = estimatedTabs;
    }
  }

  /**
   * Track user interactions
   */
  private trackUserInteractions(): void {
    // Click tracking
    let clickCount = 0;
    let lastClickReset = Date.now();
    
    document.addEventListener('click', (e) => {
      clickCount++;
      this.handleUserActivity();
      
      // Calculate click rate every 10 seconds
      const now = Date.now();
      if (now - lastClickReset > 10000) {
        const clickRate = clickCount / ((now - lastClickReset) / 1000);
        this.metrics.clickRate = clickRate;
        this.logActivity('click_rate', { rate: clickRate, count: clickCount });
        clickCount = 0;
        lastClickReset = now;
      }

      // Track specific element interactions
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        this.logActivity('interaction', {
          element: target.tagName,
          text: target.textContent?.substring(0, 50)
        });
      }
    });

    // Keyboard activity tracking
    let keyPressCount = 0;
    let lastKeyReset = Date.now();
    
    document.addEventListener('keydown', () => {
      keyPressCount++;
      this.metrics.keyboardActivity++;
      this.handleUserActivity();
      
      const now = Date.now();
      if (now - lastKeyReset > 10000) {
        const keyRate = keyPressCount / ((now - lastKeyReset) / 1000);
        this.logActivity('keyboard_rate', { rate: keyRate, count: keyPressCount });
        keyPressCount = 0;
        lastKeyReset = now;
      }
    });

    // Form interaction tracking
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        this.metrics.formInteractions++;
        this.handleUserActivity();
      }
    });

    // Copy/paste tracking (indicates active work)
    document.addEventListener('copy', () => {
      this.logActivity('copy_action', {});
      this.handleUserActivity();
    });

    document.addEventListener('paste', () => {
      this.logActivity('paste_action', {});
      this.handleUserActivity();
    });
  }

  /**
   * Track scroll behavior
   */
  private trackScrollBehavior(): void {
    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();
    let scrollEvents: number[] = [];
    
    const throttledScroll = this.throttle(() => {
      const currentScrollY = window.scrollY;
      const currentTime = Date.now();
      const distance = Math.abs(currentScrollY - lastScrollY);
      const timeDelta = currentTime - lastScrollTime;
      
      if (timeDelta > 0) {
        const speed = distance / timeDelta;
        scrollEvents.push(speed);
        
        // Keep only last 10 scroll events
        if (scrollEvents.length > 10) {
          scrollEvents.shift();
        }
        
        // Calculate average scroll speed
        const avgSpeed = scrollEvents.reduce((a, b) => a + b, 0) / scrollEvents.length;
        this.metrics.scrollSpeed = avgSpeed;
        
        // Log significant scroll patterns
        if (scrollEvents.length === 10) {
          this.logActivity('scroll_pattern', {
            avgSpeed,
            maxSpeed: Math.max(...scrollEvents),
            minSpeed: Math.min(...scrollEvents)
          });
          scrollEvents = [];
        }
      }
      
      lastScrollY = currentScrollY;
      lastScrollTime = currentTime;
      this.handleUserActivity();
    }, 100);

    window.addEventListener('scroll', throttledScroll);
  }

  /**
   * Track performance metrics
   */
  private trackPerformanceMetrics(): void {
    if (!window.performance) return;

    // Track page load performance
    window.addEventListener('load', () => {
      const perfData = performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      
      this.logActivity('page_performance', {
        pageLoadTime,
        domReadyTime,
        dnsTime: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcpTime: perfData.connectEnd - perfData.connectStart,
        requestTime: perfData.responseEnd - perfData.requestStart
      });
    });

    // Track long tasks (jank)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.duration > 50) { // Long task threshold
              this.logActivity('long_task', {
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Some browsers don't support longtask
      }
    }

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
          if (usageRatio > 0.8) {
            this.logActivity('high_memory', {
              usage: memory.usedJSHeapSize,
              limit: memory.jsHeapSizeLimit,
              ratio: usageRatio
            });
          }
        }
      }, 60000); // Check every minute
    }
  }

  /**
   * Track network activity
   */
  private trackNetworkActivity(): void {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    
    // Track connection changes
    connection.addEventListener('change', () => {
      this.logActivity('connection_change', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      });
    });

    // Track fetch/XHR requests
    let requestCount = 0;
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      requestCount++;
      const startTime = Date.now();
      
      try {
        const response = await originalFetch.apply(window, args);
        const duration = Date.now() - startTime;
        
        // Log slow requests
        if (duration > 3000) {
          this.logActivity('slow_request', {
            duration,
            url: args[0].toString().substring(0, 100)
          });
        }
        
        return response;
      } catch (error) {
        this.logActivity('request_error', {
          url: args[0].toString().substring(0, 100)
        });
        throw error;
      }
    };

    // Log request rate every minute
    setInterval(() => {
      if (requestCount > 0) {
        this.logActivity('request_rate', {
          count: requestCount,
          rate: requestCount / 60
        });
        requestCount = 0;
      }
    }, 60000);
  }

  /**
   * Track media consumption
   */
  private trackMediaConsumption(): void {
    // Track video play events
    document.addEventListener('play', (e) => {
      const target = e.target as HTMLVideoElement | HTMLAudioElement;
      if (target.tagName === 'VIDEO' || target.tagName === 'AUDIO') {
        this.metrics.mediaConsumption++;
        this.logActivity('media_play', {
          type: target.tagName.toLowerCase(),
          duration: target.duration,
          source: target.src?.substring(0, 100)
        });
      }
    }, true);

    // Track pause events
    document.addEventListener('pause', (e) => {
      const target = e.target as HTMLVideoElement | HTMLAudioElement;
      if (target.tagName === 'VIDEO' || target.tagName === 'AUDIO') {
        this.logActivity('media_pause', {
          type: target.tagName.toLowerCase(),
          currentTime: target.currentTime,
          duration: target.duration
        });
      }
    }, true);

    // Track fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      this.logActivity('fullscreen_change', {
        isFullscreen: !!document.fullscreenElement
      });
    });
  }

  /**
   * Track page unload
   */
  private trackPageUnload(): void {
    window.addEventListener('beforeunload', () => {
      this.logActivity('page_unload', {
        sessionDuration: Date.now() - this.startTime,
        totalActivities: this.activities.length,
        metrics: this.metrics
      });
      
      // Send remaining data
      this.flush(true);
    });
  }

  /**
   * Handle user activity (reset idle timer)
   */
  private handleUserActivity(): void {
    this.lastActivity = Date.now();
    
    // Update active time
    this.metrics.activeTime = this.lastActivity - this.startTime - this.metrics.idleTime;
    
    // Reset idle timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    this.idleTimer = setTimeout(() => {
      this.handleIdleState();
    }, this.IDLE_THRESHOLD);
  }

  /**
   * Handle idle state
   */
  private handleIdleState(): void {
    const idleStart = Date.now();
    this.logActivity('idle_start', {
      lastActivity: this.lastActivity,
      idleDuration: idleStart - this.lastActivity
    });
    
    // Update idle time
    this.metrics.idleTime += idleStart - this.lastActivity;
  }

  /**
   * Log activity
   */
  private logActivity(type: string, data: any): void {
    const activity: BrowserActivity = {
      type,
      timestamp: Date.now(),
      data,
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.activities.push(activity);

    // Flush if buffer is full
    if (this.activities.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Send data to API
   */
  private async flush(immediate = false): Promise<void> {
    if (this.activities.length === 0) return;

    const activitiesToSend = [...this.activities];
    this.activities = [];

    try {
      const payload = {
        sessionId: this.sessionId,
        userId: this.userId,
        activities: activitiesToSend,
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      };

      if (immediate) {
        // Use sendBeacon for immediate send on page unload
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/tracking/browser', JSON.stringify(payload));
        }
      } else {
        // Regular fetch
        await fetch('/api/tracking/browser', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }
    } catch (error) {
      console.error('Failed to send browser tracking data:', error);
      // Re-add activities to buffer for retry
      this.activities.unshift(...activitiesToSend);
    }
  }

  /**
   * Check user consent for tracking
   */
  private async checkUserConsent(): Promise<boolean> {
    // Check localStorage for consent
    const consent = localStorage.getItem('mood_spark_tracking_consent');
    
    if (consent === null) {
      // Ask for consent if not set
      // In production, this would show a proper consent dialog
      return true; // Default to true for development
    }
    
    return consent === 'true';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): BrowserMetrics {
    return {
      tabCount: 1,
      activeTime: 0,
      idleTime: 0,
      scrollSpeed: 0,
      clickRate: 0,
      keyboardActivity: 0,
      focusChanges: 0,
      pageVisits: 1,
      formInteractions: 0,
      mediaConsumption: 0
    };
  }

  /**
   * Utility: Throttle function calls
   */
  private throttle(func: Function, wait: number): (...args: any[]) => void {
    let timeout: NodeJS.Timeout | null = null;
    let lastCallTime = 0;
    
    return (...args: any[]) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;
      
      if (timeSinceLastCall >= wait) {
        func.apply(this, args);
        lastCallTime = now;
      } else if (!timeout) {
        timeout = setTimeout(() => {
          func.apply(this, args);
          lastCallTime = Date.now();
          timeout = null;
        }, wait - timeSinceLastCall);
      }
    };
  }

  /**
   * Stop tracking
   */
  public stop(): void {
    this.isTracking = false;
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Send remaining data
    this.flush(true);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): BrowserMetrics {
    return { ...this.metrics };
  }

  /**
   * Get session info
   */
  public getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.startTime,
      duration: Date.now() - this.startTime,
      activityCount: this.activities.length,
      metrics: this.getMetrics()
    };
  }
}

// Export singleton instance
let tracker: BrowserTracker | null = null;

export const getBrowserTracker = (): BrowserTracker => {
  if (!tracker && typeof window !== 'undefined') {
    tracker = new BrowserTracker();
  }
  return tracker!;
};

export default BrowserTracker;
export type { BrowserActivity, BrowserMetrics };