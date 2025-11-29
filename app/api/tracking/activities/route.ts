import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { authMiddleware } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    const userId = authResult?.userId || 'anonymous';
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get recent browser activities
    const { data: activities, error } = await supabase
      .from('browser_activities')
      .select('activity_type, timestamp, data, session_id')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch activities:', error);
      throw error;
    }

    // Process activities for display
    const processedActivities = (activities || []).map(activity => {
      let description = activity.activity_type.replace(/_/g, ' ');
      let data = activity.data || {};

      // Generate human-readable descriptions
      switch (activity.activity_type) {
        case 'window_focus':
          description = `Returned to window after ${Math.round((data.awayDuration || 0) / 1000)}s`;
          break;
        case 'window_blur':
          description = 'Switched away from window';
          break;
        case 'visibility_change':
          description = data.visible ? 'Page became visible' : 'Page became hidden';
          break;
        case 'idle_start':
          description = `Idle for ${Math.round((data.idleDuration || 0) / 1000 / 60)} minutes`;
          break;
        case 'click_rate':
          description = `Click rate: ${(data.rate || 0).toFixed(1)} clicks/sec`;
          break;
        case 'keyboard_rate':
          description = `Typing: ${(data.rate || 0).toFixed(1)} keys/sec`;
          break;
        case 'scroll_pattern':
          description = `Scrolling at ${(data.avgSpeed || 0).toFixed(1)} px/ms`;
          break;
        case 'media_play':
          description = `Started playing ${data.type || 'media'}`;
          break;
        case 'media_pause':
          description = `Paused ${data.type || 'media'}`;
          break;
        case 'page_unload':
          description = `Page closed after ${Math.round((data.sessionDuration || 0) / 1000 / 60)} minutes`;
          break;
        case 'slow_request':
          description = `Slow network request (${Math.round((data.duration || 0) / 1000)}s)`;
          break;
      }

      return {
        type: activity.activity_type,
        description,
        timestamp: activity.timestamp,
        sessionId: activity.session_id,
        data
      };
    });

    return NextResponse.json({
      activities: processedActivities,
      count: processedActivities.length
    });

  } catch (error) {
    console.error('Activities fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}