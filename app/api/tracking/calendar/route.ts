import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { authMiddleware } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const activity = await request.json();

    // Get authenticated user (optional - tracking can work without auth)
    const authResult = await authMiddleware(request);
    const userId = authResult?.userId || 'anonymous';

    // Store calendar activity
    const { error } = await supabase
      .from('browser_activities')
      .insert({
        session_id: `calendar_${Date.now()}`,
        user_id: userId,
        activity_type: activity.type,
        timestamp: activity.timestamp,
        data: activity.data
      });

    if (error) {
      console.error('Failed to store calendar activity:', error);
      throw error;
    }

    // Extract features for ML model
    const features = extractCalendarFeatures(activity);
    
    if (Object.keys(features).length > 0) {
      await supabase
        .from('feature_store')
        .insert({
          user_id: userId,
          timestamp: new Date().toISOString(),
          source: 'CALENDAR',
          features: features
        });
    }

    return NextResponse.json({
      success: true,
      activityType: activity.type
    });

  } catch (error) {
    console.error('Calendar tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to process calendar tracking data' },
      { status: 500 }
    );
  }
}

/**
 * Extract features from calendar activities for ML model
 */
function extractCalendarFeatures(activity: any) {
  const features: any = {};

  switch (activity.type) {
    case 'calendar_meeting_start':
      features.meetingStarted = 1;
      features.meetingPlatform = activity.data.platform;
      break;
      
    case 'calendar_meeting_end':
      features.meetingDuration = Math.round((activity.data.duration || 0) / 1000 / 60); // minutes
      features.meetingEnded = 1;
      break;
      
    case 'calendar_usage':
      features.calendarUsageDuration = Math.round((activity.data.duration || 0) / 1000 / 60);
      features.calendarDomain = activity.data.domain?.includes('google') ? 'google' : 
                               activity.data.domain?.includes('outlook') ? 'outlook' : 'other';
      break;
      
    case 'calendar_meeting_interaction':
      features.meetingInteractions = 1;
      if (activity.data.action === 'mute_toggle') features.muteToggles = 1;
      if (activity.data.action === 'camera_toggle') features.cameraToggles = 1;
      if (activity.data.action === 'screen_share') features.screenShares = 1;
      break;
      
    case 'calendar_scheduling_input':
      features.schedulingActivity = 1;
      break;
      
    case 'calendar_meeting_detected':
      features.meetingsDetected = 1;
      break;
      
    case 'calendar_event_detected':
      features.eventsDetected = 1;
      break;
  }

  return features;
}