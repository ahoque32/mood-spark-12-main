import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { authMiddleware } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { sessionId, userId, activities, metrics, timestamp } = body;

    // Get authenticated user (optional - tracking can work without auth)
    const authResult = await authMiddleware(request);
    const authenticatedUserId = authResult?.userId;

    // Use authenticated user ID if available, otherwise use provided ID
    const finalUserId = authenticatedUserId || userId || `anonymous_${sessionId}`;

    // Store browser session data (upsert)
    const { error: sessionError } = await supabase
      .from('browser_sessions')
      .upsert({
        session_id: sessionId,
        user_id: finalUserId,
        start_time: timestamp,
        last_activity: timestamp,
        metrics: metrics,
        activity_count: activities.length
      }, {
        onConflict: 'session_id',
        ignoreDuplicates: false
      });

    if (sessionError) {
      console.error('Failed to store browser session:', sessionError);
      throw sessionError;
    }

    // Store individual activities for detailed analysis
    const activitiesData = activities.map((activity: any) => ({
      session_id: sessionId,
      user_id: finalUserId,
      activity_type: activity.type,
      timestamp: activity.timestamp,
      data: activity.data
    }));

    if (activitiesData.length > 0) {
      const { error: activitiesError } = await supabase
        .from('browser_activities')
        .insert(activitiesData);

      if (activitiesError) {
        console.error('Failed to store browser activities:', activitiesError);
      }
    }

    // Calculate and store aggregated features for ML model
    const features = extractBrowserFeatures(activities, metrics);
    
    if (Object.keys(features).length > 0) {
      const { error: featuresError } = await supabase
        .from('feature_store')
        .insert({
          user_id: finalUserId,
          timestamp: timestamp,
          source: 'BROWSER',
          features: features
        });

      if (featuresError) {
        console.error('Failed to store features:', featuresError);
      }
    }

    // If user is authenticated, update their last activity
    if (authenticatedUserId) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ updated_at: timestamp })
        .eq('id', authenticatedUserId);

      if (updateError) {
        console.error('Failed to update user activity:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      activitiesProcessed: activities.length
    });

  } catch (error) {
    console.error('Browser tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to process browser tracking data' },
      { status: 500 }
    );
  }
}

/**
 * Extract features from browser activities for ML model
 */
function extractBrowserFeatures(activities: any[], metrics: any) {
  const features: any = {};

  // Activity intensity features
  features.browserActiveTimeMin = Math.round(metrics.activeTime / 1000 / 60);
  features.browserIdleTimeMin = Math.round(metrics.idleTime / 1000 / 60);
  features.browserEngagementRatio = metrics.activeTime / (metrics.activeTime + metrics.idleTime + 1);

  // Interaction features
  features.browserClickRate = metrics.clickRate || 0;
  features.browserKeyboardActivity = metrics.keyboardActivity || 0;
  features.browserScrollSpeed = metrics.scrollSpeed || 0;
  features.browserFormInteractions = metrics.formInteractions || 0;

  // Focus features
  features.browserFocusChanges = metrics.focusChanges || 0;
  features.browserTabCount = metrics.tabCount || 1;

  // Media features
  features.browserMediaConsumption = metrics.mediaConsumption || 0;

  // Page visit patterns
  features.browserPageVisits = metrics.pageVisits || 0;

  // Activity type counts
  const activityTypes = activities.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {});

  // Specific activity features
  features.browserIdleEvents = activityTypes.idle_start || 0;
  features.browserCopyPasteEvents = (activityTypes.copy_action || 0) + (activityTypes.paste_action || 0);
  features.browserMediaEvents = (activityTypes.media_play || 0) + (activityTypes.media_pause || 0);
  features.browserSlowRequests = activityTypes.slow_request || 0;

  // Context switching
  features.browserWindowBlurEvents = activityTypes.window_blur || 0;
  features.browserVisibilityChanges = activityTypes.visibility_change || 0;

  // Performance indicators
  const longTasks = activities.filter(a => a.type === 'long_task');
  features.browserLongTasks = longTasks.length;
  features.browserAvgLongTaskDuration = longTasks.length > 0
    ? longTasks.reduce((sum, t) => sum + (t.data?.duration || 0), 0) / longTasks.length
    : 0;

  return features;
}