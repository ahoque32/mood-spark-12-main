#!/usr/bin/env node

/**
 * Mood Spark - System Usage Background Agent
 * 
 * Tracks system-wide laptop usage and stores data via existing API endpoints.
 * Monitors keyboard/mouse activity, screen lock/unlock, and active applications.
 * 
 * Usage: node index.js
 */

const activeWindow = require('active-win');
// Note: iohook removed due to compatibility issues with Node.js v22
const { machineId } = require('node-machine-id');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
// Note: For Node.js compatibility, we'll implement the system tracking directly here
// The TypeScript version is available for the web app

class SystemUsageAgent {
  constructor() {
    this.config = {
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
      userId: null, // Will be set after authentication
      deviceId: null,
      pollInterval: 30000, // 30 seconds
      idleThreshold: 5 * 60 * 1000, // 5 minutes
      retryAttempts: 3,
      retryDelay: 1000
    };

    this.state = {
      isActive: true,
      lastActivity: Date.now(),
      currentApp: null,
      sessionStart: Date.now(),
      isScreenLocked: false,
      activityBuffer: [],
      hourlyStats: new Map(),
      lastSystemMetrics: null
    };

    // System information modules
    this.si = require('systeminformation');
    this.os = require('os');
    const { exec } = require('child_process');
    this.util = require('util');
    this.execAsync = this.util.promisify(exec);

    this.timers = {
      pollTimer: null,
      idleCheckTimer: null,
      statsTimer: null,
      systemMetricsTimer: null
    };

    console.log('🚀 System Usage Agent initializing...');
  }

  async initialize() {
    try {
      // Get unique device identifier
      this.config.deviceId = await machineId();
      console.log(`📱 Device ID: ${this.config.deviceId.slice(0, 8)}...`);

      // Load or create user session
      await this.setupUserSession();

      // Initialize activity monitoring
      this.setupActivityMonitoring();

      // Start periodic tasks
      this.startPeriodicTasks();

      console.log('✅ System Usage Agent started successfully');
      console.log(`👤 User ID: ${this.config.userId}`);
      console.log(`🔄 Polling every ${this.config.pollInterval / 1000}s`);

    } catch (error) {
      console.error('❌ Failed to initialize agent:', error.message);
      process.exit(1);
    }
  }

  async setupUserSession() {
    const sessionFile = path.join(__dirname, '.session.json');
    
    // First, try to detect current user session from main app
    await this.detectCurrentUser();
    
    if (!this.config.userId) {
      try {
        // Try to load cached session
        const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf8'));
        
        if (sessionData.userId && sessionData.deviceId === this.config.deviceId) {
          // Validate session with API
          const isValid = await this.validateSession(sessionData.userId);
          if (isValid) {
            this.config.userId = sessionData.userId;
            console.log('🔐 Using cached user session');
            return;
          }
        }
      } catch (error) {
        // Session file doesn't exist or is invalid
      }

      // Fall back to anonymous tracking if no user session found
      await this.createAnonymousSession(sessionFile);
    }
  }

  async detectCurrentUser() {
    try {
      // Check if user is logged in by making request to /auth/me
      // This uses the same cookies as the main app
      const response = await this.makeApiRequest('/auth/me', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        this.config.userId = data.user.id;
        console.log(`✅ Detected logged-in user: ${data.user.email}`);
        
        // Save session for future use
        await this.saveUserSession(data.user);
        return true;
      }
    } catch (error) {
      console.log('ℹ️  No active user session detected');
    }
    return false;
  }

  async saveUserSession(user) {
    const sessionFile = path.join(__dirname, '.session.json');
    const sessionData = {
      userId: user.id,
      userEmail: user.email,
      deviceId: this.config.deviceId,
      lastLogin: new Date().toISOString()
    };

    try {
      await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
      console.log('💾 User session saved');
    } catch (error) {
      console.warn('⚠️  Failed to save session:', error.message);
    }
  }

  async validateSession(userId) {
    try {
      const response = await this.makeApiRequest('/auth/me');
      if (response.ok) {
        const data = await response.json();
        return data.user.id === userId;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async createAnonymousSession(sessionFile) {
    // Create anonymous session for tracking when no user is logged in
    this.config.userId = `anonymous_${this.config.deviceId}`;
    this.config.isAnonymous = true;
    
    console.log('👻 Using anonymous tracking mode');
    console.log('ℹ️  System usage will be stored anonymously until user logs in');
    
    const sessionData = {
      userId: this.config.userId,
      isAnonymous: true,
      deviceId: this.config.deviceId,
      createdAt: new Date().toISOString()
    };

    try {
      await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
    } catch (error) {
      console.warn('⚠️  Failed to save anonymous session:', error.message);
    }
  }

  setupActivityMonitoring() {
    // Note: Simplified activity monitoring without iohook
    // Monitor screen lock/unlock (platform-specific)
    this.setupScreenMonitoring();

    console.log('🖱️  Activity monitoring started (simplified mode)');
  }

  setupScreenMonitoring() {
    // This is a simplified implementation
    // In production, you'd want platform-specific screen lock detection
    const { exec } = require('child_process');
    
    if (process.platform === 'darwin') {
      // macOS implementation
      setInterval(() => {
        exec('pmset -g powerstate IODisplayWrangler | grep -q "ON" && echo "unlocked" || echo "locked"', 
          (error, stdout) => {
            if (!error) {
              const isLocked = stdout.trim() === 'locked';
              if (isLocked !== this.state.isScreenLocked) {
                this.handleScreenEvent(isLocked ? 'lock' : 'unlock');
              }
            }
          });
      }, 10000); // Check every 10 seconds
    }
  }

  handleActivity(type) {
    const now = Date.now();
    this.state.lastActivity = now;
    
    if (!this.state.isActive) {
      this.state.isActive = true;
      this.logSystemEvent('device_active', { 
        previousState: 'idle',
        activityType: type 
      });
    }
  }

  handleScreenEvent(event) {
    this.state.isScreenLocked = event === 'lock';
    this.logSystemEvent(`screen_${event}`, { 
      timestamp: new Date().toISOString() 
    });
  }

  startPeriodicTasks() {
    // Check for idle state every minute
    this.timers.idleCheckTimer = setInterval(() => {
      this.checkIdleState();
    }, 60000);

    // Poll active window every 30 seconds
    this.timers.pollTimer = setInterval(async () => {
      await this.pollActiveWindow();
    }, this.config.pollInterval);

    // Generate hourly stats
    this.timers.statsTimer = setInterval(() => {
      this.generateHourlyStats();
    }, 60 * 60 * 1000); // Every hour

    // Check for user login/logout every 2 minutes
    this.timers.sessionCheckTimer = setInterval(async () => {
      await this.checkUserSession();
    }, 2 * 60 * 1000); // Every 2 minutes

    // Collect comprehensive system metrics every 2 minutes
    this.timers.systemMetricsTimer = setInterval(async () => {
      await this.collectSystemMetrics();
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  async checkUserSession() {
    const wasAnonymous = this.config.isAnonymous;
    const previousUserId = this.config.userId;
    
    // Try to detect current user
    const userDetected = await this.detectCurrentUser();
    
    if (!wasAnonymous && !userDetected) {
      // User logged out
      console.log('🚪 User logged out, switching to anonymous mode');
      this.config.isAnonymous = true;
      this.config.userId = `anonymous_${this.config.deviceId}`;
      
      this.logSystemEvent('user_logout', {
        previousUserId: previousUserId,
        timestamp: new Date().toISOString()
      });
      
    } else if (wasAnonymous && userDetected) {
      // User logged in
      console.log('🔑 User logged in, switching to authenticated mode');
      this.config.isAnonymous = false;
      
      this.logSystemEvent('user_login', {
        userId: this.config.userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  checkIdleState() {
    const now = Date.now();
    const timeSinceActivity = now - this.state.lastActivity;

    if (timeSinceActivity > this.config.idleThreshold && this.state.isActive) {
      this.state.isActive = false;
      this.logSystemEvent('device_idle', { 
        idleDuration: timeSinceActivity,
        lastActivity: new Date(this.state.lastActivity).toISOString()
      });
    }
  }

  async pollActiveWindow() {
    try {
      const windowInfo = await activeWindow();
      
      if (windowInfo && windowInfo.owner.name !== this.state.currentApp) {
        const previousApp = this.state.currentApp;
        this.state.currentApp = windowInfo.owner.name;
        
        this.logSystemEvent('app_switch', {
          from: previousApp,
          to: this.state.currentApp,
          windowTitle: windowInfo.title
        });
      }
    } catch (error) {
      console.warn('⚠️  Failed to get active window:', error.message);
    }
  }

  async collectSystemMetrics() {
    try {
      console.log('📊 Collecting comprehensive system metrics...');
      
      const metrics = await this.gatherSystemMetrics();
      this.state.lastSystemMetrics = metrics;
      
      // Send comprehensive metrics to API
      await this.sendSystemMetricsToAPI(metrics);
      
      console.log('✅ System metrics collected and sent to API');
      console.log(`   CPU: ${metrics.cpu.usage.toFixed(1)}% | Memory: ${(metrics.memory.used / 1024 / 1024 / 1024).toFixed(1)}GB`);
      console.log(`   Active App: ${metrics.applications.active} | Focus Score: ${metrics.focus.focusScore.toFixed(2)}`);
      
    } catch (error) {
      console.warn('⚠️  Failed to collect system metrics:', error.message);
    }
  }

  async gatherSystemMetrics() {
    const now = Date.now();
    
    // Collect system performance data
    const [cpuData, memData, processData, diskData, networkData] = await Promise.all([
      this.si.currentLoad(),
      this.si.mem(),
      this.si.processes(),
      this.si.fsSize(),
      this.si.networkStats()
    ]);

    // Get active window for application tracking
    const activeApp = await this.getActiveApplication();
    
    // Calculate focus and productivity metrics
    const focusMetrics = this.calculateFocusMetrics(activeApp, processData);
    
    // Get development activity
    const devActivity = await this.getDevelopmentActivity(processData);
    
    // Get communication status
    const commActivity = this.getCommunicationActivity(processData);

    return {
      timestamp: new Date().toISOString(),
      cpu: {
        usage: cpuData.currentLoad,
        temperature: cpuData.cpus?.[0]?.temp || null,
        processes: processData.all,
        loadAverage: this.os.loadavg()
      },
      memory: {
        total: memData.total,
        used: memData.used,
        free: memData.free,
        pressure: memData.used / memData.total,
        swapUsed: memData.swapused
      },
      disk: {
        total: diskData.reduce((acc, disk) => acc + disk.size, 0),
        used: diskData.reduce((acc, disk) => acc + disk.used, 0),
        free: diskData.reduce((acc, disk) => acc + disk.available, 0)
      },
      network: {
        bytesReceived: networkData.reduce((acc, net) => acc + net.rx_bytes, 0),
        bytesSent: networkData.reduce((acc, net) => acc + net.tx_bytes, 0),
        packetsReceived: networkData.reduce((acc, net) => acc + net.rx_sec, 0),
        packetsSent: networkData.reduce((acc, net) => acc + net.tx_sec, 0)
      },
      applications: {
        active: activeApp?.name || this.state.currentApp || 'Unknown',
        allRunning: this.categorizeRunningApps(processData.list),
        focusTime: focusMetrics.focusTime,
        switches: focusMetrics.appSwitches
      },
      development: devActivity,
      communication: commActivity,
      focus: focusMetrics,
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: this.os.uptime(),
        battery: await this.getBatteryInfo(),
        doNotDisturb: await this.getDoNotDisturbStatus()
      }
    };
  }

  async getActiveApplication() {
    try {
      const window = await activeWindow();
      return {
        name: window?.owner?.name,
        title: window?.title,
        pid: window?.owner?.pid
      };
    } catch (error) {
      return null;
    }
  }

  categorizeRunningApps(processes) {
    const appCategories = {
      development: ['Code', 'WebStorm', 'IntelliJ', 'Xcode', 'Terminal', 'iTerm'],
      communication: ['Slack', 'Teams', 'Zoom', 'Discord', 'Skype'],
      browsers: ['Chrome', 'Firefox', 'Safari', 'Edge'],
      productivity: ['Notion', 'Obsidian', 'Evernote', 'Word', 'Excel'],
      media: ['Spotify', 'iTunes', 'VLC', 'YouTube'],
      system: ['Finder', 'System Preferences', 'Activity Monitor']
    };

    const categorized = {};
    const runningApps = [];

    processes.slice(0, 20).forEach(proc => {
      const appName = proc.name;
      const category = Object.keys(appCategories).find(cat => 
        appCategories[cat].some(app => appName.includes(app))
      ) || 'other';

      if (!categorized[category]) categorized[category] = [];
      categorized[category].push({
        name: appName,
        pid: proc.pid,
        cpu: proc.cpu,
        memory: proc.mem
      });

      runningApps.push({
        name: appName,
        category,
        cpu: proc.cpu,
        memory: proc.mem
      });
    });

    return { categorized, summary: runningApps.slice(0, 10) };
  }

  calculateFocusMetrics(activeApp, processData) {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    // Simple focus calculation based on app switches and active applications
    const distractingApps = ['Safari', 'Chrome', 'YouTube', 'Netflix', 'Instagram', 'Twitter'];
    const focusApps = ['Code', 'Terminal', 'Xcode', 'Notion', 'Word'];
    
    const activeAppName = activeApp?.name || '';
    const isDistractingApp = distractingApps.some(app => activeAppName.includes(app));
    const isFocusApp = focusApps.some(app => activeAppName.includes(app));
    
    // Calculate metrics (simplified for this implementation)
    const distractionScore = isDistractingApp ? 0.8 : 0.2;
    const focusScore = isFocusApp ? 0.9 : 0.4;
    
    return {
      distractionScore,
      focusScore,
      deepWorkMinutes: isFocusApp ? 2 : 0, // Simplified - assume 2 min intervals
      breaksTaken: isDistractingApp ? 1 : 0,
      focusTime: isFocusApp ? 2 * 60 : 0, // 2 minutes in seconds
      appSwitches: this.state.activityBuffer.filter(
        event => event.type === 'app_switch' && 
        new Date(event.timestamp).getTime() > hourAgo
      ).length
    };
  }

  async getDevelopmentActivity(processData) {
    const devProcesses = processData.list.filter(proc => 
      ['Code', 'Terminal', 'iTerm', 'node', 'npm', 'git'].some(dev => 
        proc.name.toLowerCase().includes(dev.toLowerCase())
      )
    );

    // Check for Git activity (simplified)
    let gitCommits = 0;
    try {
      const { stdout } = await this.execAsync('git log --oneline --since="2 hours ago" 2>/dev/null | wc -l');
      gitCommits = parseInt(stdout.trim()) || 0;
    } catch (error) {
      // Not in a git repo or git not available
    }

    return {
      ideActive: devProcesses.some(proc => 
        ['Code', 'WebStorm', 'Xcode'].some(ide => proc.name.includes(ide))
      ),
      gitCommits,
      terminalSessions: devProcesses.filter(proc => 
        ['Terminal', 'iTerm'].some(term => proc.name.includes(term))
      ).length,
      dockerContainers: devProcesses.filter(proc => 
        proc.name.includes('Docker')
      ).length,
      localServers: devProcesses.filter(proc => 
        ['node', 'npm', 'serve'].some(server => proc.name.includes(server))
      ).length
    };
  }

  getCommunicationActivity(processData) {
    const commApps = processData.list.filter(proc => 
      ['Zoom', 'Teams', 'Slack', 'Discord', 'Skype'].some(app => 
        proc.name.includes(app)
      )
    );

    const meetingApps = commApps.filter(proc => 
      ['Zoom', 'Teams', 'Skype'].some(app => proc.name.includes(app))
    );

    return {
      meetingActive: meetingApps.length > 0,
      meetingDuration: meetingApps.length > 0 ? 2 : 0, // Simplified
      slackActive: commApps.some(proc => proc.name.includes('Slack')),
      discordActive: commApps.some(proc => proc.name.includes('Discord'))
    };
  }

  async getBatteryInfo() {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await this.execAsync('pmset -g batt | grep -o "[0-9]*%" | head -1');
        return parseInt(stdout.replace('%', '')) || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getDoNotDisturbStatus() {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await this.execAsync('defaults read ~/Library/Preferences/ByHost/com.apple.notificationcenterui doNotDisturb 2>/dev/null');
        return stdout.trim() === '1';
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async sendSystemMetricsToAPI(metrics) {
    // Skip for anonymous sessions, but log locally
    if (this.config.isAnonymous) {
      console.log('📝 [ANONYMOUS] System metrics collected (not sent to API)');
      return;
    }

    try {
      const response = await this.makeApiRequest('/tracking/system', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Device-ID': this.config.deviceId
        },
        body: JSON.stringify(metrics)
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ System metrics sent to API (System Score: ${data.systemScore})`);
      } else {
        throw new Error(`API responded with ${response.status}`);
      }

    } catch (error) {
      console.warn('⚠️  Failed to send system metrics to API:', error.message);
      // Store failed metrics for retry when user logs back in
      this.storeFailedEvent({
        type: 'system_metrics',
        timestamp: new Date().toISOString(),
        deviceId: this.config.deviceId,
        data: metrics
      });
    }
  }

  generateHourlyStats() {
    const hour = new Date().getHours();
    const now = Date.now();
    
    // Calculate activity for this hour
    const hourlyActivity = this.state.activityBuffer.filter(
      event => new Date(event.timestamp).getHours() === hour
    );

    const stats = {
      hour,
      totalEvents: hourlyActivity.length,
      activeTime: this.calculateActiveTime(hourlyActivity),
      topApps: this.getTopApplications(hourlyActivity)
    };

    this.state.hourlyStats.set(hour, stats);
    
    // Log hourly summary as a mood entry with system source
    this.logSystemEvent('hourly_summary', stats);
    
    // Clear old activity buffer (keep last 24 hours)
    const cutoff = now - (24 * 60 * 60 * 1000);
    this.state.activityBuffer = this.state.activityBuffer.filter(
      event => new Date(event.timestamp).getTime() > cutoff
    );
  }

  calculateActiveTime(events) {
    // Simplified calculation - count periods between activity events
    let activeTime = 0;
    let lastActive = null;

    for (const event of events) {
      if (event.type === 'device_active' || event.type === 'app_switch') {
        lastActive = new Date(event.timestamp).getTime();
      } else if (event.type === 'device_idle' && lastActive) {
        activeTime += new Date(event.timestamp).getTime() - lastActive;
        lastActive = null;
      }
    }

    return Math.round(activeTime / 1000 / 60); // Return minutes
  }

  getTopApplications(events) {
    const appCounts = {};
    
    events
      .filter(e => e.type === 'app_switch' && e.data.to)
      .forEach(e => {
        appCounts[e.data.to] = (appCounts[e.data.to] || 0) + 1;
      });

    return Object.entries(appCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([app, count]) => ({ app, count }));
  }

  async logSystemEvent(eventType, data = {}) {
    const eventData = {
      type: eventType,
      timestamp: new Date().toISOString(),
      deviceId: this.config.deviceId,
      data
    };

    // Add to activity buffer
    this.state.activityBuffer.push(eventData);

    // Send to API as a mood entry with SYSTEM source
    await this.sendToAPI(eventData);

    console.log(`📊 ${eventType}:`, JSON.stringify(data, null, 2));
  }

  async sendToAPI(eventData) {
    // Skip API calls for anonymous sessions
    if (this.config.isAnonymous) {
      console.log(`📝 [ANONYMOUS] ${eventData.type} (not sent to API)`);
      return;
    }

    try {
      // Map system event to mood entry format
      const moodData = {
        mood: this.mapEventToMoodValue(eventData.type),
        note: JSON.stringify({
          systemEvent: eventData.type,
          deviceId: this.config.deviceId,
          userId: this.config.userId,
          data: eventData.data
        }),
        source: 'ANALYZED', // Use ANALYZED since we don't have SYSTEM yet
        timestamp: eventData.timestamp
      };

      const response = await this.makeApiRequest('/moods', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Device-ID': this.config.deviceId
        },
        body: JSON.stringify(moodData)
      });

      if (response.ok) {
        console.log(`✅ ${eventData.type} sent to API`);
      } else {
        throw new Error(`API responded with ${response.status}`);
      }

    } catch (error) {
      console.warn(`⚠️  Failed to send ${eventData.type} to API:`, error.message);
      // Store failed events for retry when user logs back in
      this.storeFailedEvent(eventData);
    }
  }

  storeFailedEvent(eventData) {
    // Store failed events to retry later when user logs in
    if (!this.state.failedEvents) {
      this.state.failedEvents = [];
    }
    
    this.state.failedEvents.push({
      ...eventData,
      failedAt: new Date().toISOString()
    });

    // Limit failed events storage to prevent memory issues
    if (this.state.failedEvents.length > 1000) {
      this.state.failedEvents = this.state.failedEvents.slice(-500);
    }
  }

  mapEventToMoodValue(eventType) {
    // Map system events to mood scale (1-5)
    const eventMoodMap = {
      'device_active': 4,      // Positive engagement
      'device_idle': 2,        // Lower engagement
      'screen_lock': 1,        // No engagement
      'screen_unlock': 3,      // Returning to activity
      'app_switch': 3,         // Neutral activity
      'hourly_summary': 3      // Neutral data point
    };
    
    return eventMoodMap[eventType] || 3;
  }

  async makeApiRequest(endpoint, options = {}) {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          timeout: 10000,
          ...options
        });
        
        if (!response.ok && attempt === this.config.retryAttempts) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        return response;
        
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          throw error;
        }
        
        console.warn(`⚠️  API request attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
      }
    }
  }

  shutdown() {
    console.log('🛑 Shutting down System Usage Agent...');
    
    // Clear timers
    Object.values(this.timers).forEach(timer => {
      if (timer) clearInterval(timer);
    });

    // Note: iohook cleanup removed (not needed in simplified mode)

    // Log shutdown event
    this.logSystemEvent('agent_shutdown', {
      uptime: Date.now() - this.state.sessionStart,
      totalEvents: this.state.activityBuffer.length
    });

    console.log('✅ Agent shutdown complete');
    process.exit(0);
  }
}

// Initialize and run the agent
async function main() {
  const agent = new SystemUsageAgent();

  // Graceful shutdown handling
  process.on('SIGINT', () => agent.shutdown());
  process.on('SIGTERM', () => agent.shutdown());
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    agent.shutdown();
  });

  try {
    await agent.initialize();
  } catch (error) {
    console.error('💥 Failed to start agent:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = SystemUsageAgent;