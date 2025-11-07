/**
 * Feature Extractor for ML Model
 * Transforms raw system events into ML features
 */

class FeatureExtractor {
  constructor() {
    this.baselineCache = new Map();
    this.windowSize = {
      realtime: 30 * 60 * 1000,    // 30 minutes
      hourly: 60 * 60 * 1000,       // 1 hour
      daily: 24 * 60 * 60 * 1000    // 24 hours
    };
  }

  /**
   * Extract all features from event buffer
   */
  extractFeatures(events, userId) {
    const now = Date.now();
    const features = {
      timestamp: new Date().toISOString(),
      userId: userId,
      
      // Activity intensity features
      ...this.extractActivityFeatures(events, now),
      
      // Application usage features
      ...this.extractAppFeatures(events, now),
      
      // Temporal features
      ...this.extractTemporalFeatures(now),
      
      // Behavioral change features
      ...this.extractBehavioralFeatures(events, userId, now),
      
      // Productivity features
      ...this.extractProductivityFeatures(events, now)
    };

    return features;
  }

  /**
   * Activity-related features
   */
  extractActivityFeatures(events, now) {
    const realtimeEvents = this.filterByTimeWindow(events, now, this.windowSize.realtime);
    const hourlyEvents = this.filterByTimeWindow(events, now, this.windowSize.hourly);
    
    // Calculate activity metrics
    const keyboardEvents = realtimeEvents.filter(e => 
      e.data?.activityType === 'keyboard').length;
    const mouseEvents = realtimeEvents.filter(e => 
      e.data?.activityType === 'mouse').length;
    
    // Idle periods
    const idleEvents = hourlyEvents.filter(e => e.type === 'device_idle');
    const activeEvents = hourlyEvents.filter(e => e.type === 'device_active');
    
    // Calculate idle time
    let totalIdleTime = 0;
    idleEvents.forEach(idle => {
      totalIdleTime += (idle.data?.idleDuration || 0);
    });
    
    const activityRate = (keyboardEvents + mouseEvents) / (this.windowSize.realtime / 1000 / 60);
    const idleRatio = Math.min(totalIdleTime / this.windowSize.hourly, 1);
    const engagementScore = 1 - idleRatio;
    
    // Session metrics
    const sessions = this.extractSessions(hourlyEvents);
    const avgSessionLength = sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length / 1000 / 60
      : 0;
    
    return {
      activityRate30m: Math.round(activityRate * 10) / 10,
      keyboardActivity30m: keyboardEvents,
      mouseActivity30m: mouseEvents,
      keyboardMouseRatio: keyboardEvents / (mouseEvents + 1),
      idleRatio1h: Math.round(idleRatio * 100) / 100,
      engagementScore: Math.round(engagementScore * 100) / 100,
      activePeriods1h: activeEvents.length,
      idlePeriods1h: idleEvents.length,
      avgSessionLengthMin: Math.round(avgSessionLength * 10) / 10,
      maxContinuousWorkMin: Math.round(this.getMaxContinuousWork(sessions) / 60),
    };
  }

  /**
   * Application usage features
   */
  extractAppFeatures(events, now) {
    const hourlyEvents = this.filterByTimeWindow(events, now, this.windowSize.hourly);
    const appSwitches = hourlyEvents.filter(e => e.type === 'app_switch');
    
    // App usage statistics
    const appUsage = new Map();
    let lastApp = null;
    let lastTime = null;
    
    appSwitches.forEach(event => {
      const app = event.data?.to;
      if (app) {
        if (!appUsage.has(app)) {
          appUsage.set(app, { count: 0, duration: 0 });
        }
        appUsage.get(app).count++;
        
        if (lastApp && lastTime) {
          const duration = new Date(event.timestamp) - new Date(lastTime);
          appUsage.get(lastApp).duration += duration;
        }
        
        lastApp = app;
        lastTime = event.timestamp;
      }
    });
    
    // Get top apps
    const topApps = Array.from(appUsage.entries())
      .sort((a, b) => b[1].duration - a[1].duration)
      .slice(0, 3)
      .map(([app]) => app);
    
    // Calculate focus metrics
    const focusDurations = Array.from(appUsage.values())
      .map(a => a.duration / 1000 / 60);
    const avgFocusDuration = focusDurations.length > 0
      ? focusDurations.reduce((sum, d) => sum + d, 0) / focusDurations.length
      : 0;
    
    // Categorize apps
    const productiveApps = this.getProductiveApps(appUsage);
    const leisureApps = this.getLeisureApps(appUsage);
    
    const totalAppTime = Array.from(appUsage.values())
      .reduce((sum, a) => sum + a.duration, 0);
    const productiveTime = productiveApps
      .reduce((sum, app) => sum + (appUsage.get(app)?.duration || 0), 0);
    
    return {
      appSwitches1h: appSwitches.length,
      uniqueApps1h: appUsage.size,
      currentApp: lastApp || 'unknown',
      topApp1: topApps[0] || 'none',
      topApp2: topApps[1] || 'none',
      topApp3: topApps[2] || 'none',
      avgFocusDurationMin: Math.round(avgFocusDuration * 10) / 10,
      maxFocusDurationMin: Math.round(Math.max(...focusDurations, 0) * 10) / 10,
      productiveAppRatio: totalAppTime > 0 
        ? Math.round(productiveTime / totalAppTime * 100) / 100
        : 0,
      contextSwitchRate: appSwitches.length / (this.windowSize.hourly / 1000 / 60 / 60),
      multitaskingIndex: appUsage.size > 0 
        ? Math.round(appSwitches.length / appUsage.size * 10) / 10
        : 0
    };
  }

  /**
   * Temporal features
   */
  extractTemporalFeatures(now) {
    const date = new Date(now);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    return {
      hourOfDay: hour,
      dayOfWeek: dayOfWeek,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isMorning: hour >= 6 && hour < 12,
      isAfternoon: hour >= 12 && hour < 17,
      isEvening: hour >= 17 && hour < 22,
      isNight: hour >= 22 || hour < 6,
      timeOfDayCategory: this.getTimeOfDayCategory(hour),
      minuteOfHour: date.getMinutes(),
      weekOfMonth: Math.ceil(date.getDate() / 7)
    };
  }

  /**
   * Behavioral change features (compared to baseline)
   */
  extractBehavioralFeatures(events, userId, now) {
    const baseline = this.getOrCalculateBaseline(events, userId);
    const currentMetrics = this.extractActivityFeatures(events, now);
    
    const features = {
      activityVsBaseline: baseline.avgActivity > 0
        ? Math.round(currentMetrics.activityRate30m / baseline.avgActivity * 100) / 100
        : 1,
      focusVsBaseline: baseline.avgFocus > 0
        ? Math.round(currentMetrics.avgSessionLengthMin / baseline.avgFocus * 100) / 100
        : 1,
      earlyLateIndicator: this.calculateEarlyLateIndicator(events, baseline),
      workingOvertime: currentMetrics.engagementScore > baseline.avgEngagement * 1.2,
      activityTrend1h: this.calculateActivityTrend(events, now, 60),
      activityTrend3h: this.calculateActivityTrend(events, now, 180),
      fatigueIndicator: this.calculateFatigueIndicator(events, now)
    };
    
    return features;
  }

  /**
   * Productivity-specific features
   */
  extractProductivityFeatures(events, now) {
    const hourlyEvents = this.filterByTimeWindow(events, now, this.windowSize.hourly);
    const dailyEvents = this.filterByTimeWindow(events, now, this.windowSize.daily);
    
    // Break patterns
    const breaks = hourlyEvents.filter(e => 
      e.type === 'device_idle' && e.data?.idleDuration > 5 * 60 * 1000);
    const avgBreakDuration = breaks.length > 0
      ? breaks.reduce((sum, b) => sum + (b.data?.idleDuration || 0), 0) / breaks.length / 1000 / 60
      : 0;
    
    // Work rhythm
    const sessions = this.extractSessions(dailyEvents);
    const workBursts = sessions.map(s => s.duration / 1000 / 60);
    const workRhythmStd = this.calculateStandardDeviation(workBursts);
    
    // Distraction score
    const leisureAppSwitches = hourlyEvents.filter(e => 
      e.type === 'app_switch' && this.isLeisureApp(e.data?.to));
    const totalAppSwitches = hourlyEvents.filter(e => e.type === 'app_switch');
    const distractionScore = totalAppSwitches.length > 0
      ? leisureAppSwitches.length / totalAppSwitches.length
      : 0;
    
    return {
      breaksTaken1h: breaks.length,
      avgBreakDurationMin: Math.round(avgBreakDuration * 10) / 10,
      totalBreakTimeMin: Math.round(breaks.reduce((sum, b) => 
        sum + (b.data?.idleDuration || 0), 0) / 1000 / 60),
      workRhythmVariability: Math.round(workRhythmStd * 10) / 10,
      distractionScore: Math.round(distractionScore * 100) / 100,
      productivityScore: this.calculateProductivityScore(events, now),
      deepWorkPeriods: sessions.filter(s => s.duration > 25 * 60 * 1000).length,
      interruptionRate: this.calculateInterruptionRate(hourlyEvents)
    };
  }

  /**
   * Helper methods
   */
  
  filterByTimeWindow(events, now, windowSize) {
    const cutoff = now - windowSize;
    return events.filter(e => 
      new Date(e.timestamp).getTime() > cutoff
    );
  }

  extractSessions(events) {
    const sessions = [];
    let currentSession = null;
    
    events.forEach(event => {
      if (event.type === 'device_active') {
        currentSession = {
          start: new Date(event.timestamp).getTime(),
          duration: 0
        };
      } else if (event.type === 'device_idle' && currentSession) {
        currentSession.duration = new Date(event.timestamp).getTime() - currentSession.start;
        sessions.push(currentSession);
        currentSession = null;
      }
    });
    
    return sessions;
  }

  getMaxContinuousWork(sessions) {
    return sessions.reduce((max, s) => 
      Math.max(max, s.duration / 1000), 0
    );
  }

  getProductiveApps(appUsage) {
    const productive = ['vscode', 'visual studio code', 'intellij', 'sublime', 
                       'terminal', 'iterm', 'slack', 'teams', 'zoom', 
                       'chrome', 'firefox', 'safari', 'notion', 'obsidian'];
    return Array.from(appUsage.keys()).filter(app => 
      productive.some(p => app.toLowerCase().includes(p))
    );
  }

  getLeisureApps(appUsage) {
    const leisure = ['youtube', 'netflix', 'spotify', 'discord', 'reddit', 
                    'twitter', 'facebook', 'instagram', 'tiktok', 'twitch'];
    return Array.from(appUsage.keys()).filter(app => 
      leisure.some(l => app.toLowerCase().includes(l))
    );
  }

  isLeisureApp(app) {
    if (!app) return false;
    const leisure = ['youtube', 'netflix', 'spotify', 'discord', 'reddit', 
                    'twitter', 'facebook', 'instagram', 'tiktok', 'twitch'];
    return leisure.some(l => app.toLowerCase().includes(l));
  }

  getTimeOfDayCategory(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  getOrCalculateBaseline(events, userId) {
    // Check cache first
    if (this.baselineCache.has(userId)) {
      const cached = this.baselineCache.get(userId);
      if (Date.now() - cached.timestamp < this.windowSize.hourly) {
        return cached.baseline;
      }
    }
    
    // Calculate baseline from last 7 days
    const weekEvents = this.filterByTimeWindow(events, Date.now(), 7 * this.windowSize.daily);
    const baseline = {
      avgActivity: this.calculateAverageActivity(weekEvents),
      avgFocus: this.calculateAverageFocus(weekEvents),
      avgEngagement: this.calculateAverageEngagement(weekEvents),
      typicalStartTime: this.calculateTypicalStartTime(weekEvents),
      typicalEndTime: this.calculateTypicalEndTime(weekEvents)
    };
    
    // Cache baseline
    this.baselineCache.set(userId, {
      baseline,
      timestamp: Date.now()
    });
    
    return baseline;
  }

  calculateAverageActivity(events) {
    const activityEvents = events.filter(e => 
      e.type === 'device_active' || e.data?.activityType);
    return activityEvents.length / 7; // Daily average
  }

  calculateAverageFocus(events) {
    const sessions = this.extractSessions(events);
    return sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length / 1000 / 60
      : 30; // Default 30 minutes
  }

  calculateAverageEngagement(events) {
    const idleEvents = events.filter(e => e.type === 'device_idle');
    const totalTime = 7 * 8 * 60 * 60 * 1000; // 7 days * 8 hours
    const idleTime = idleEvents.reduce((sum, e) => 
      sum + (e.data?.idleDuration || 0), 0);
    return 1 - (idleTime / totalTime);
  }

  calculateTypicalStartTime(events) {
    // Find typical first activity of the day
    return 9; // Default 9 AM, would calculate from events
  }

  calculateTypicalEndTime(events) {
    // Find typical last activity of the day
    return 18; // Default 6 PM, would calculate from events
  }

  calculateEarlyLateIndicator(events, baseline) {
    const todayStart = this.findTodayStartTime(events);
    if (!todayStart) return 0;
    
    const startHour = new Date(todayStart).getHours();
    return baseline.typicalStartTime - startHour; // Positive if earlier
  }

  findTodayStartTime(events) {
    const today = new Date().toDateString();
    const todayEvents = events.filter(e => 
      new Date(e.timestamp).toDateString() === today &&
      e.type === 'device_active'
    );
    return todayEvents.length > 0 ? todayEvents[0].timestamp : null;
  }

  calculateActivityTrend(events, now, minutesAgo) {
    const recentWindow = minutesAgo * 60 * 1000;
    const previousWindow = recentWindow * 2;
    
    const recentEvents = this.filterByTimeWindow(events, now, recentWindow);
    const previousEvents = this.filterByTimeWindow(events, now - recentWindow, recentWindow);
    
    const recentActivity = recentEvents.filter(e => 
      e.type === 'device_active' || e.data?.activityType).length;
    const previousActivity = previousEvents.filter(e => 
      e.type === 'device_active' || e.data?.activityType).length;
    
    return previousActivity > 0 
      ? (recentActivity - previousActivity) / previousActivity
      : 0;
  }

  calculateFatigueIndicator(events, now) {
    // Look for declining activity over last 3 hours
    const trend1h = this.calculateActivityTrend(events, now, 60);
    const trend2h = this.calculateActivityTrend(events, now - 60 * 60 * 1000, 60);
    const trend3h = this.calculateActivityTrend(events, now - 2 * 60 * 60 * 1000, 60);
    
    // Fatigue indicated by consistent decline
    return trend1h < -0.2 && trend2h < -0.1 && trend3h < -0.1;
  }

  calculateProductivityScore(events, now) {
    const features = this.extractAppFeatures(events, now);
    const activityFeatures = this.extractActivityFeatures(events, now);
    
    // Weighted productivity score
    const score = (
      features.productiveAppRatio * 0.4 +
      (1 - features.distractionScore) * 0.3 +
      activityFeatures.engagementScore * 0.3
    );
    
    return Math.round(score * 100);
  }

  calculateInterruptionRate(events) {
    const appSwitches = events.filter(e => e.type === 'app_switch');
    const quickSwitches = [];
    
    for (let i = 1; i < appSwitches.length; i++) {
      const timeDiff = new Date(appSwitches[i].timestamp) - new Date(appSwitches[i-1].timestamp);
      if (timeDiff < 60 * 1000) { // Less than 1 minute
        quickSwitches.push(appSwitches[i]);
      }
    }
    
    return quickSwitches.length;
  }

  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }
}

module.exports = FeatureExtractor;