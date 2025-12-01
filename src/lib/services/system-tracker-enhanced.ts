/**
 * Enhanced System Tracker
 * Comprehensive system-level monitoring beyond browser activity
 */

import * as os from 'os';
import * as si from 'systeminformation';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SystemMetrics {
  timestamp: number;
  
  // System Performance
  cpu: {
    usage: number;
    temperature?: number;
    processes: number;
    loadAverage: number[];
  };
  
  memory: {
    total: number;
    used: number;
    free: number;
    pressure: number;
    swapUsed: number;
  };
  
  disk: {
    read: number;
    write: number;
    usage: number;
    ioWait?: number;
  };
  
  network: {
    bytesReceived: number;
    bytesSent: number;
    connections: number;
    vpnActive: boolean;
  };
  
  // Application Tracking
  applications: {
    active: string;
    allRunning: AppUsage[];
    focusTime: number;
    switches: number;
  };
  
  // Communication & Collaboration
  communication: {
    meetingActive: boolean;
    meetingDuration?: number;
    slackStatus?: string;
    emailUnread?: number;
    messagesTyped?: number;
  };
  
  // Development Activity
  development: {
    ideActive: boolean;
    gitCommits?: number;
    linesChanged?: number;
    terminalSessions: number;
    dockerContainers?: number;
    localhostServers?: number;
  };
  
  // Media & Content
  media: {
    audioPlaying: boolean;
    videoPlaying: boolean;
    screenRecording: boolean;
    cameraActive: boolean;
    microphoneActive: boolean;
  };
  
  // Focus & Productivity
  focus: {
    distractionScore: number; // 0-100
    focusScore: number; // 0-100
    deepWorkMinutes: number;
    breaksTaken: number;
    pomodoroActive?: boolean;
  };
  
  // Environmental
  environment: {
    batteryLevel?: number;
    charging?: boolean;
    displayBrightness?: number;
    doNotDisturb?: boolean;
    nightShift?: boolean;
    connectedDisplays: number;
  };
  
  // Browser Data (if available)
  browser?: {
    tabs: number;
    activeUrl?: string;
    activeDomain?: string;
    youtubeActive?: boolean;
    socialMediaActive?: boolean;
  };
}

export interface AppUsage {
  name: string;
  pid: number;
  cpu: number;
  memory: number;
  duration: number;
  category?: string; // productivity, communication, entertainment, development, etc.
}

export class EnhancedSystemTracker {
  private metrics: SystemMetrics;
  private previousNetworkStats: any;
  private appStartTimes: Map<string, number> = new Map();
  private focusStartTime: number | null = null;
  private distractionEvents: number[] = [];
  private lastAppSwitch: number = Date.now();
  private meetingStartTime: number | null = null;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics() {
    this.metrics = {
      timestamp: Date.now(),
      cpu: { usage: 0, processes: 0, loadAverage: [0, 0, 0] },
      memory: { total: 0, used: 0, free: 0, pressure: 0, swapUsed: 0 },
      disk: { read: 0, write: 0, usage: 0 },
      network: { bytesReceived: 0, bytesSent: 0, connections: 0, vpnActive: false },
      applications: { active: '', allRunning: [], focusTime: 0, switches: 0 },
      communication: { meetingActive: false },
      development: { ideActive: false, terminalSessions: 0 },
      media: { 
        audioPlaying: false, 
        videoPlaying: false, 
        screenRecording: false,
        cameraActive: false,
        microphoneActive: false
      },
      focus: { 
        distractionScore: 0, 
        focusScore: 100, 
        deepWorkMinutes: 0, 
        breaksTaken: 0 
      },
      environment: { connectedDisplays: 1 }
    };
  }

  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();
    
    // Run all collections in parallel for efficiency
    const [
      cpuData,
      memData,
      diskData,
      networkData,
      processData,
      displayData
    ] = await Promise.all([
      this.collectCPUMetrics(),
      this.collectMemoryMetrics(),
      this.collectDiskMetrics(),
      this.collectNetworkMetrics(),
      this.collectProcessMetrics(),
      this.collectDisplayMetrics()
    ]);

    // Platform-specific collections
    if (process.platform === 'darwin') {
      await this.collectMacOSSpecificMetrics();
    } else if (process.platform === 'win32') {
      await this.collectWindowsSpecificMetrics();
    }

    // Calculate derived metrics
    this.calculateFocusMetrics();
    this.detectMeetings();
    this.categorizeApplications();

    this.metrics.timestamp = timestamp;
    return { ...this.metrics };
  }

  private async collectCPUMetrics() {
    try {
      const load = await si.currentLoad();
      const temp = await si.cpuTemperature();
      const processes = await si.processes();
      
      this.metrics.cpu = {
        usage: load.currentLoad,
        temperature: temp.main || undefined,
        processes: processes.all,
        loadAverage: os.loadavg()
      };
    } catch (error) {
      console.error('Failed to collect CPU metrics:', error);
    }
  }

  private async collectMemoryMetrics() {
    try {
      const mem = await si.mem();
      
      this.metrics.memory = {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        pressure: (mem.used / mem.total) * 100,
        swapUsed: mem.swapused || 0
      };
    } catch (error) {
      console.error('Failed to collect memory metrics:', error);
    }
  }

  private async collectDiskMetrics() {
    try {
      const diskIO = await si.disksIO();
      const fsSize = await si.fsSize();
      
      const mainDisk = fsSize[0];
      
      this.metrics.disk = {
        read: diskIO.rIO_sec || 0,
        write: diskIO.wIO_sec || 0,
        usage: mainDisk ? (mainDisk.used / mainDisk.size) * 100 : 0,
        ioWait: diskIO.ms || undefined
      };
    } catch (error) {
      console.error('Failed to collect disk metrics:', error);
    }
  }

  private async collectNetworkMetrics() {
    try {
      const networkStats = await si.networkStats();
      const networkConnections = await si.networkConnections();
      
      const primaryInterface = networkStats[0];
      
      // Calculate network speed
      let bytesReceived = 0;
      let bytesSent = 0;
      
      if (primaryInterface) {
        if (this.previousNetworkStats) {
          bytesReceived = primaryInterface.rx_bytes - this.previousNetworkStats.rx_bytes;
          bytesSent = primaryInterface.tx_bytes - this.previousNetworkStats.tx_bytes;
        }
        this.previousNetworkStats = primaryInterface;
      }

      // Check for VPN
      const vpnActive = await this.checkVPN();

      this.metrics.network = {
        bytesReceived,
        bytesSent,
        connections: networkConnections.length,
        vpnActive
      };
    } catch (error) {
      console.error('Failed to collect network metrics:', error);
    }
  }

  private async collectProcessMetrics() {
    try {
      const processes = await si.processes();
      
      // Get top applications by CPU and memory
      const apps: AppUsage[] = processes.list
        .filter(p => p.cpu > 0.1 || p.mem > 0.5)
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 20)
        .map(p => ({
          name: p.name,
          pid: p.pid,
          cpu: p.cpu,
          memory: p.mem,
          duration: this.getAppDuration(p.name),
          category: this.categorizeApp(p.name)
        }));

      // Detect active window (platform specific)
      const activeApp = await this.getActiveWindow();
      
      // Track app switches
      if (activeApp && activeApp !== this.metrics.applications.active) {
        this.metrics.applications.switches++;
        this.lastAppSwitch = Date.now();
        
        // Update focus time for previous app
        const prevApp = this.metrics.applications.active;
        if (prevApp && this.appStartTimes.has(prevApp)) {
          const duration = Date.now() - this.appStartTimes.get(prevApp)!;
          this.metrics.applications.focusTime += duration;
        }
        
        this.appStartTimes.set(activeApp, Date.now());
      }

      this.metrics.applications = {
        active: activeApp || '',
        allRunning: apps,
        focusTime: this.metrics.applications.focusTime,
        switches: this.metrics.applications.switches
      };

      // Check for development tools
      this.detectDevelopmentActivity(processes.list);
      
      // Check for communication apps
      this.detectCommunicationActivity(processes.list);
      
      // Check for media activity
      this.detectMediaActivity(processes.list);
      
    } catch (error) {
      console.error('Failed to collect process metrics:', error);
    }
  }

  private async collectDisplayMetrics() {
    try {
      const graphics = await si.graphics();
      this.metrics.environment.connectedDisplays = graphics.displays.length;
    } catch (error) {
      console.error('Failed to collect display metrics:', error);
    }
  }

  private async collectMacOSSpecificMetrics() {
    try {
      // Battery info
      const battery = await si.battery();
      if (battery.hasBattery) {
        this.metrics.environment.batteryLevel = battery.percent;
        this.metrics.environment.charging = battery.isCharging;
      }

      // Check Do Not Disturb
      const { stdout: dndStatus } = await execAsync(
        'defaults read com.apple.controlcenter "NSStatusItem Visible FocusModes" 2>/dev/null || echo "0"'
      );
      this.metrics.environment.doNotDisturb = dndStatus.trim() === '1';

      // Check Night Shift
      const { stdout: nightShift } = await execAsync(
        'defaults read com.apple.CoreBrightness CBBlueReductionStatus 2>/dev/null | grep -q "Enabled = 1" && echo "1" || echo "0"'
      );
      this.metrics.environment.nightShift = nightShift.trim() === '1';

      // Check camera and microphone
      const { stdout: cameraCheck } = await execAsync(
        'lsof | grep -E "AppleCamera|VDC" | head -1'
      ).catch(() => ({ stdout: '' }));
      this.metrics.media.cameraActive = !!cameraCheck;

      const { stdout: micCheck } = await execAsync(
        'ioreg -c AppleHDAEngineInput | grep -q IOAudioEngineState && echo "1" || echo "0"'
      ).catch(() => ({ stdout: '0' }));
      this.metrics.media.microphoneActive = micCheck.trim() === '1';

    } catch (error) {
      console.error('Failed to collect macOS metrics:', error);
    }
  }

  private async collectWindowsSpecificMetrics() {
    try {
      // Windows-specific metrics
      const battery = await si.battery();
      if (battery.hasBattery) {
        this.metrics.environment.batteryLevel = battery.percent;
        this.metrics.environment.charging = battery.isCharging;
      }

      // Check camera (Windows)
      const { stdout: cameraCheck } = await execAsync(
        'powershell "Get-PnpDevice -FriendlyName *camera* | Where-Object {$_.Status -eq \'OK\'}"'
      ).catch(() => ({ stdout: '' }));
      this.metrics.media.cameraActive = !!cameraCheck;

    } catch (error) {
      console.error('Failed to collect Windows metrics:', error);
    }
  }

  private async getActiveWindow(): Promise<string | null> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync(
          'osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\''
        );
        return stdout.trim();
      } else if (process.platform === 'win32') {
        const { stdout } = await execAsync(
          'powershell "(Get-Process | Where-Object {$_.MainWindowTitle -ne \'\'} | Select-Object -First 1).ProcessName"'
        );
        return stdout.trim();
      }
    } catch (error) {
      console.error('Failed to get active window:', error);
    }
    return null;
  }

  private async checkVPN(): Promise<boolean> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync('scutil --nc list | grep Connected');
        return stdout.includes('Connected');
      } else if (process.platform === 'win32') {
        const { stdout } = await execAsync('rasdial');
        return !stdout.includes('No connections');
      }
    } catch {
      return false;
    }
    return false;
  }

  private detectDevelopmentActivity(processes: any[]) {
    const devTools = ['code', 'vscode', 'sublime', 'atom', 'webstorm', 'idea', 'pycharm', 'vim', 'nvim', 'emacs'];
    const terminals = ['terminal', 'iterm', 'hyper', 'cmd', 'powershell', 'warp', 'alacritty'];
    
    this.metrics.development.ideActive = processes.some(p => 
      devTools.some(tool => p.name.toLowerCase().includes(tool))
    );
    
    this.metrics.development.terminalSessions = processes.filter(p =>
      terminals.some(term => p.name.toLowerCase().includes(term))
    ).length;

    // Check for local servers
    const localServers = processes.filter(p => 
      p.name.includes('node') || 
      p.name.includes('python') || 
      p.name.includes('ruby') ||
      p.name.includes('php')
    ).length;
    this.metrics.development.localhostServers = localServers;

    // Check Docker
    const dockerRunning = processes.some(p => p.name.toLowerCase().includes('docker'));
    if (dockerRunning) {
      execAsync('docker ps -q | wc -l').then(({ stdout }) => {
        this.metrics.development.dockerContainers = parseInt(stdout.trim()) || 0;
      }).catch(() => {});
    }
  }

  private detectCommunicationActivity(processes: any[]) {
    const meetingApps = ['zoom', 'teams', 'meet', 'skype', 'webex', 'gotomeeting'];
    const messagingApps = ['slack', 'discord', 'telegram', 'whatsapp', 'messages'];
    
    const meetingActive = processes.some(p => 
      meetingApps.some(app => p.name.toLowerCase().includes(app))
    );

    if (meetingActive && !this.meetingStartTime) {
      this.meetingStartTime = Date.now();
    } else if (!meetingActive && this.meetingStartTime) {
      const duration = Date.now() - this.meetingStartTime;
      this.metrics.communication.meetingDuration = Math.round(duration / 1000 / 60); // minutes
      this.meetingStartTime = null;
    }

    this.metrics.communication.meetingActive = meetingActive;

    // Check Slack status (if Slack is running)
    const slackRunning = processes.some(p => p.name.toLowerCase().includes('slack'));
    if (slackRunning) {
      this.metrics.communication.slackStatus = 'active';
    }
  }

  private detectMediaActivity(processes: any[]) {
    const mediaApps = ['spotify', 'music', 'youtube', 'netflix', 'vlc', 'quicktime'];
    const browsers = ['chrome', 'safari', 'firefox', 'edge', 'brave'];
    
    // Check if media apps are running
    const mediaAppRunning = processes.some(p => 
      mediaApps.some(app => p.name.toLowerCase().includes(app))
    );

    // Check if browsers have high CPU (likely playing video)
    const browserHighCPU = processes.some(p => 
      browsers.some(browser => p.name.toLowerCase().includes(browser)) && p.cpu > 10
    );

    this.metrics.media.audioPlaying = mediaAppRunning;
    this.metrics.media.videoPlaying = browserHighCPU || mediaAppRunning;

    // Check screen recording
    const screenRecording = processes.some(p => 
      p.name.toLowerCase().includes('screencapture') ||
      p.name.toLowerCase().includes('obs') ||
      p.name.toLowerCase().includes('quicktime')
    );
    this.metrics.media.screenRecording = screenRecording;
  }

  private detectMeetings() {
    // Additional meeting detection based on multiple signals
    const signals = {
      camera: this.metrics.media.cameraActive,
      microphone: this.metrics.media.microphoneActive,
      meetingApp: this.metrics.communication.meetingActive,
      highNetwork: this.metrics.network.bytesSent > 1000000 // > 1MB/s upload
    };

    const signalCount = Object.values(signals).filter(Boolean).length;
    
    // If 2+ signals, likely in a meeting
    if (signalCount >= 2 && !this.metrics.communication.meetingActive) {
      this.metrics.communication.meetingActive = true;
    }
  }

  private calculateFocusMetrics() {
    const now = Date.now();
    
    // Calculate distraction score based on app switches
    const timeSinceSwitch = now - this.lastAppSwitch;
    const switchesPerHour = (this.metrics.applications.switches / (now / 3600000)) || 0;
    
    // Distraction factors
    const factors = {
      appSwitches: Math.min(switchesPerHour / 20, 1), // Normalize to 0-1
      socialMedia: this.isSocialMediaActive() ? 0.3 : 0,
      notifications: this.metrics.communication.meetingActive ? 0 : 0.2,
      multitasking: this.metrics.applications.allRunning.length > 10 ? 0.2 : 0
    };

    this.metrics.focus.distractionScore = Math.round(
      Object.values(factors).reduce((a, b) => a + b, 0) * 100
    );

    this.metrics.focus.focusScore = 100 - this.metrics.focus.distractionScore;

    // Deep work detection (focused for >25 min on productive app)
    if (timeSinceSwitch > 25 * 60 * 1000 && this.isProductiveApp(this.metrics.applications.active)) {
      if (!this.focusStartTime) {
        this.focusStartTime = this.lastAppSwitch;
      }
      this.metrics.focus.deepWorkMinutes = Math.round((now - this.focusStartTime) / 60000);
    } else {
      this.focusStartTime = null;
    }
  }

  private categorizeApp(appName: string): string {
    const name = appName.toLowerCase();
    
    const categories = {
      'development': ['code', 'vscode', 'sublime', 'atom', 'webstorm', 'idea', 'terminal', 'docker'],
      'communication': ['slack', 'teams', 'zoom', 'discord', 'mail', 'outlook'],
      'productivity': ['notion', 'obsidian', 'todoist', 'trello', 'asana', 'excel', 'word'],
      'browser': ['chrome', 'safari', 'firefox', 'edge', 'brave'],
      'entertainment': ['spotify', 'music', 'netflix', 'youtube', 'steam', 'games'],
      'design': ['figma', 'sketch', 'photoshop', 'illustrator', 'affinity'],
      'system': ['finder', 'explorer', 'settings', 'preferences']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  private categorizeApplications() {
    // Categorize all running applications
    this.metrics.applications.allRunning.forEach(app => {
      if (!app.category) {
        app.category = this.categorizeApp(app.name);
      }
    });
  }

  private getAppDuration(appName: string): number {
    if (this.appStartTimes.has(appName)) {
      return Date.now() - this.appStartTimes.get(appName)!;
    }
    return 0;
  }

  private isSocialMediaActive(): boolean {
    const socialApps = ['twitter', 'facebook', 'instagram', 'tiktok', 'reddit', 'linkedin'];
    return this.metrics.applications.allRunning.some(app => 
      socialApps.some(social => app.name.toLowerCase().includes(social))
    );
  }

  private isProductiveApp(appName: string): boolean {
    const category = this.categorizeApp(appName);
    return ['development', 'productivity', 'design'].includes(category);
  }

  async startTracking(intervalMs: number = 30000) {
    console.log('🚀 Starting enhanced system tracking...');
    
    // Initial collection
    await this.collectMetrics();
    
    // Regular interval collection
    setInterval(async () => {
      const metrics = await this.collectMetrics();
      await this.sendMetricsToAPI(metrics);
    }, intervalMs);
  }

  private async sendMetricsToAPI(metrics: SystemMetrics) {
    try {
      const response = await fetch('/api/tracking/system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metrics)
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      
      console.log('✅ System metrics sent to API');
    } catch (error) {
      console.error('Failed to send metrics to API:', error);
    }
  }
}

// Singleton instance
let tracker: EnhancedSystemTracker | null = null;

export function getEnhancedSystemTracker(): EnhancedSystemTracker {
  if (!tracker) {
    tracker = new EnhancedSystemTracker();
  }
  return tracker;
}