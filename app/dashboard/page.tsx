'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useBrowserTracking } from '@/hooks/useBrowserTracking';
import { useCalendarTracking } from '@/hooks/useCalendarTracking';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Brain, Clock, Globe, Laptop, MousePointer, Keyboard, Eye, TrendingUp, TrendingDown, Wifi, Battery, Calendar, Users, Video } from 'lucide-react';

interface SystemMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  activeApp?: string;
  idleTime?: number;
  sessionDuration?: number;
}

interface BrowserMetrics {
  activeTime: number;
  idleTime: number;
  clickRate: number;
  keyboardActivity: number;
  scrollSpeed: number;
  focusChanges: number;
  tabCount: number;
  pageVisits: number;
  formInteractions: number;
  mediaConsumption: number;
}

interface RealtimeData {
  timestamp: string;
  mood?: number;
  productivity?: number;
  engagement?: number;
  stress?: number;
}

export default function Dashboard() {
  const browserTracking = useBrowserTracking();
  const calendarTracking = useCalendarTracking();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({});
  const [realtimeData, setRealtimeData] = useState<RealtimeData[]>([]);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch system metrics from background agent
  useEffect(() => {
    const fetchSystemMetrics = async () => {
      try {
        const response = await fetch('/api/tracking/system/current');
        if (response.ok) {
          const data = await response.json();
          setSystemMetrics(data);
        }
      } catch (error) {
        console.error('Failed to fetch system metrics:', error);
      }
    };

    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch realtime aggregated data
  useEffect(() => {
    const fetchRealtimeData = async () => {
      try {
        const response = await fetch('/api/tracking/realtime');
        if (response.ok) {
          const data = await response.json();
          setRealtimeData(prev => {
            const newData = [...prev, data];
            // Keep only last 30 data points
            return newData.slice(-30);
          });
          setPredictions(data.predictions || {});
        }
      } catch (error) {
        console.error('Failed to fetch realtime data:', error);
      }
      setIsLoading(false);
    };

    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch activity history
  useEffect(() => {
    const fetchActivityHistory = async () => {
      try {
        const response = await fetch('/api/tracking/activities?limit=50');
        if (response.ok) {
          const data = await response.json();
          setActivityHistory(data.activities || []);
        }
      } catch (error) {
        console.error('Failed to fetch activity history:', error);
      }
    };

    fetchActivityHistory();
    const interval = setInterval(fetchActivityHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const browserMetrics = browserTracking.metrics as BrowserMetrics || {
    activeTime: 0,
    idleTime: 0,
    clickRate: 0,
    keyboardActivity: 0,
    scrollSpeed: 0,
    focusChanges: 0,
    tabCount: 1,
    pageVisits: 0,
    formInteractions: 0,
    mediaConsumption: 0
  };

  // Calculate engagement score
  const engagementScore = browserMetrics.activeTime > 0 
    ? Math.round((browserMetrics.activeTime / (browserMetrics.activeTime + browserMetrics.idleTime)) * 100)
    : 0;

  // Prepare chart data
  const activityChartData = realtimeData.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    mood: d.mood || 0,
    productivity: d.productivity || 0,
    engagement: d.engagement || 0,
    stress: d.stress || 0
  }));

  const browserActivityData = [
    { name: 'Active', value: Math.round(browserMetrics.activeTime / 1000 / 60), color: '#10b981' },
    { name: 'Idle', value: Math.round(browserMetrics.idleTime / 1000 / 60), color: '#ef4444' }
  ];

  const interactionData = [
    { name: 'Clicks', value: browserMetrics.clickRate * 60, icon: MousePointer },
    { name: 'Keys', value: browserMetrics.keyboardActivity, icon: Keyboard },
    { name: 'Focus', value: browserMetrics.focusChanges, icon: Eye },
    { name: 'Forms', value: browserMetrics.formInteractions, icon: Activity }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Realtime Metrics Dashboard</h1>
          <p className="text-muted-foreground">Monitor your device usage and behavioral patterns</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={browserTracking.isTracking ? "default" : "secondary"}>
            {browserTracking.isTracking ? "Tracking Active" : "Tracking Inactive"}
          </Badge>
          <Badge variant="outline">
            Session: {browserTracking.sessionId?.substring(0, 8) || 'N/A'}
          </Badge>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Engagement Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{engagementScore}%</div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={engagementScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Productivity Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{predictions.productivityScore || 0}</div>
              <Brain className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={predictions.productivityScore || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {Math.round(browserMetrics.activeTime / 1000 / 60)}m
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last {Math.round((browserMetrics.activeTime + browserMetrics.idleTime) / 1000 / 60)} minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current App</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold truncate">
                {systemMetrics.activeApp || 'Chrome'}
              </div>
              <Laptop className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {browserMetrics.tabCount} tabs open
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="realtime" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="realtime">Realtime</TabsTrigger>
          <TabsTrigger value="browser">Browser</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Realtime Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="mood" stroke="#8b5cf6" name="Mood" />
                  <Line type="monotone" dataKey="productivity" stroke="#10b981" name="Productivity" />
                  <Line type="monotone" dataKey="engagement" stroke="#3b82f6" name="Engagement" />
                  <Line type="monotone" dataKey="stress" stroke="#ef4444" name="Stress" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Stream */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Stream</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activityHistory.map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{activity.type}</Badge>
                      <span className="text-sm">{activity.description}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="browser" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active vs Idle Time */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={browserActivityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}m`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {browserActivityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Interaction Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Interaction Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={interactionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Browser Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Click Rate</p>
                    <p className="text-lg font-bold">{browserMetrics.clickRate.toFixed(1)}/s</p>
                  </div>
                  <MousePointer className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Scroll Speed</p>
                    <p className="text-lg font-bold">{browserMetrics.scrollSpeed.toFixed(1)}</p>
                  </div>
                  <TrendingDown className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Page Visits</p>
                    <p className="text-lg font-bold">{browserMetrics.pageVisits}</p>
                  </div>
                  <Globe className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Media</p>
                    <p className="text-lg font-bold">{browserMetrics.mediaConsumption}</p>
                  </div>
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Calendar Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Calendar Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold">
                      {calendarTracking.isConnected ? 'Connected' : 'Detecting'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {calendarTracking.provider || 'Browser-based'}
                    </p>
                  </div>
                  <Calendar className={`h-6 w-6 ${calendarTracking.isConnected ? 'text-green-500' : 'text-orange-500'}`} />
                </div>
              </CardContent>
            </Card>

            {/* Meeting Count */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Meetings Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{calendarTracking.getMetrics()?.meetingCount || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(calendarTracking.getMetrics()?.meetingDuration || 0)}m total
                    </p>
                  </div>
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            {/* Calendar Utilization */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Calendar Load</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{Math.round(calendarTracking.getMetrics()?.calendarUtilization || 0)}%</div>
                    <p className="text-xs text-muted-foreground">of workday scheduled</p>
                  </div>
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <Progress value={calendarTracking.getMetrics()?.calendarUtilization || 0} className="mt-2" />
              </CardContent>
            </Card>

            {/* Back-to-Back Meetings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Back-to-Back</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{calendarTracking.getMetrics()?.backToBackMeetings || 0}</div>
                    <p className="text-xs text-muted-foreground">meeting transitions</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium mb-2">Meeting Patterns</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Average meeting duration</span>
                      <Badge variant="outline">{Math.round(calendarTracking.getMetrics()?.averageMeetingDuration || 0)}m</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Meeting density</span>
                      <Badge variant="outline">{(calendarTracking.getMetrics()?.meetingDensity || 0).toFixed(1)}/hour</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Focus time blocks</span>
                      <Badge variant="outline">{calendarTracking.getMetrics()?.focusTimeBlocks || 0}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Personal time ratio</span>
                      <Badge variant="outline">{Math.round((calendarTracking.getMetrics()?.personalTimeRatio || 0) * 100)}%</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium mb-2">Detection Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${calendarTracking.isConnected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      <span>Calendar integration: {calendarTracking.isConnected ? 'Active' : 'Browser detection'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="w-4 h-4 text-blue-500" />
                      <span>Meeting platform detection: Active</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span>Scheduling behavior tracking: Active</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-teal-500" />
                      <span>Events tracked: {calendarTracking.eventCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How Calendar Tracking Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>📅 <strong>Browser Detection:</strong> Monitors calendar websites (Google Calendar, Outlook, etc.) and meeting platforms (Zoom, Teams, Meet)</p>
                <p>🎥 <strong>Meeting Detection:</strong> Tracks video conference sessions and meeting interactions (mute, camera, screen sharing)</p>
                <p>⏰ <strong>Scheduling Patterns:</strong> Analyzes meeting density, back-to-back meetings, and work-life balance</p>
                <p>🔒 <strong>Privacy:</strong> No sensitive meeting content is stored - only patterns and duration data</p>
                <p>🔗 <strong>Full Integration:</strong> Connect your Google/Outlook calendar for detailed insights (coming soon)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">CPU Usage</span>
                    <span className="text-sm font-bold">{systemMetrics.cpuUsage || 0}%</span>
                  </div>
                  <Progress value={systemMetrics.cpuUsage || 0} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Memory Usage</span>
                    <span className="text-sm font-bold">{systemMetrics.memoryUsage || 0}%</span>
                  </div>
                  <Progress value={systemMetrics.memoryUsage || 0} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Active Application</span>
                  <Badge>{systemMetrics.activeApp || 'Unknown'}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Session Duration</span>
                  <span className="text-sm font-mono">
                    {Math.round((systemMetrics.sessionDuration || 0) / 60)}m
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">Idle Time</span>
                  <span className="text-sm font-mono">
                    {Math.round((systemMetrics.idleTime || 0) / 60)}m
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ML Predictions & Insights</CardTitle>
              {predictions.modelVersion && (
                <p className="text-xs text-muted-foreground">Model: {predictions.modelVersion}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Predicted Mood</span>
                      <Badge variant={predictions.mood > 3 ? "default" : "destructive"}>
                        {predictions.mlPrediction ? predictions.mlPrediction.toFixed(1) : predictions.mood}/5
                      </Badge>
                    </div>
                    <Progress value={(predictions.mood || 0) * 20} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Stress Level</span>
                      <Badge variant={predictions.stress < 50 ? "default" : "destructive"}>
                        {predictions.stress || 0}%
                      </Badge>
                    </div>
                    <Progress value={predictions.stress || 0} />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Focus Quality</span>
                      <Badge>{predictions.focusQuality || 0}%</Badge>
                    </div>
                    <Progress value={predictions.focusQuality || 0} />
                  </div>

                  {predictions.topFactors && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Top Influencing Factors</h4>
                      <div className="space-y-1">
                        {predictions.topFactors.map((factor: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span>{factor.feature.replace(/_/g, ' ')}</span>
                            <Badge variant="outline">{(factor.importance * 100).toFixed(1)}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {predictions.recommendations?.map((rec: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    )) || (
                      <p className="text-sm text-muted-foreground">No recommendations available</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ML Model Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Mood Predictions Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={activityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[1, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="mood" stroke="#8b5cf6" name="Actual Mood" strokeWidth={2} />
                  {predictions.mlPrediction && (
                    <Line type="monotone" dataKey="predicted" stroke="#10b981" name="Predicted" strokeDasharray="5 5" />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}