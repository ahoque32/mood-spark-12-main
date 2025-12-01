import { NextRequest, NextResponse } from "next/server";
import { AuthService } from '@/lib/auth';
import { handleDatabaseError } from '@/lib/db/errors';
import { supabase } from '@/lib/db/client';

export async function POST(request: NextRequest) {
  try {
    // Check for device ID in header for background agent authentication
    const deviceId = request.headers.get('X-Device-ID');
    let userId: string;
    
    if (deviceId) {
      // Background agent authentication - use device ID to identify user
      const sessionResponse = await fetch(`${request.nextUrl.origin}/api/tracking/session?deviceId=${deviceId}`);
      if (!sessionResponse.ok) {
        return NextResponse.json({ error: 'Device not recognized' }, { status: 401 });
      }
      const sessionData = await sessionResponse.json();
      userId = sessionData.userId;
    } else {
      // Regular user authentication
      const payload = await AuthService.authenticateRequest(request);
      userId = payload.userId;
    }

    const systemMetrics = await request.json();
    
    // Store system metrics as mood entries with SYSTEM source
    const moodData = {
      user_id: userId,
      mood_value: calculateSystemMoodScore(systemMetrics),
      notes: JSON.stringify({
        type: 'system_metrics',
        deviceId: deviceId || 'web',
        metrics: systemMetrics,
        timestamp: new Date().toISOString()
      }),
      context: { source: 'SYSTEM' },
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('mood_entries')
      .insert(moodData)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      moodEntry: data,
      systemScore: moodData.mood_value 
    });

  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await AuthService.authenticateRequest(request);
    
    // Get recent system metrics for this user
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', payload.userId)
      .contains('context', { source: 'SYSTEM' })
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;

    const systemEntries = data.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp,
      systemScore: entry.mood_value,
      metrics: JSON.parse(entry.notes || '{}')
    }));

    return NextResponse.json({ systemEntries });

  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: dbError.statusCode }
    );
  }
}

function calculateSystemMoodScore(metrics: any): number {
  // Calculate a mood score (1-5) based on system performance and activity
  let score = 3; // Start neutral
  
  // CPU performance impact
  if (metrics.cpu?.usage < 30) score += 0.5;
  else if (metrics.cpu?.usage > 80) score -= 1;
  
  // Memory pressure impact
  if (metrics.memory?.pressure < 0.3) score += 0.3;
  else if (metrics.memory?.pressure > 0.8) score -= 0.7;
  
  // Focus metrics impact
  if (metrics.focus?.focusScore > 0.7) score += 1;
  else if (metrics.focus?.distractionScore > 0.7) score -= 0.8;
  
  // Development activity boost
  if (metrics.development?.ideActive) score += 0.4;
  if (metrics.development?.gitCommits > 0) score += 0.3;
  
  // Meeting impact
  if (metrics.communication?.meetingActive) {
    if (metrics.communication.meetingDuration > 60) score -= 0.3; // Long meetings
    else score += 0.2; // Short, productive meetings
  }
  
  // Deep work bonus
  if (metrics.focus?.deepWorkMinutes > 25) score += 0.5;
  
  // Environmental factors
  if (metrics.environment?.battery < 20) score -= 0.2;
  if (metrics.environment?.doNotDisturb) score += 0.3;
  
  // Clamp between 1 and 5
  return Math.max(1, Math.min(5, Math.round(score * 10) / 10));
}