import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { authMiddleware } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    const userId = authResult?.userId || 'anonymous';

    // Get latest features from multiple sources
    const { data: features, error: featuresError } = await supabase
      .from('feature_store')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (featuresError) {
      console.error('Failed to fetch features:', featuresError);
    }

    // Get latest browser metrics
    const { data: browserSessions, error: browserError } = await supabase
      .from('browser_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity', { ascending: false })
      .limit(1);

    const browserSession = browserSessions?.[0] || null;

    if (browserError) {
      console.error('Failed to fetch browser session:', browserError);
    }

    // Get recent mood entries
    const { data: moods, error: moodsError } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (moodsError) {
      console.error('Failed to fetch moods:', moodsError);
    }

    // Aggregate metrics
    const aggregated = aggregateMetrics(features || [], browserSession, moods || []);

    // Generate predictions using ML model and heuristics
    const predictions = await generatePredictions(aggregated, userId);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...aggregated,
      predictions
    });

  } catch (error) {
    console.error('Realtime data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch realtime data' },
      { status: 500 }
    );
  }
}

function aggregateMetrics(features: any[], browserSession: any, moods: any[]) {
  // Parse and combine features
  let combined: any = {
    mood: 3,
    productivity: 50,
    engagement: 50,
    stress: 30
  };

  // Process feature store data
  if (features && features.length > 0) {
    const latestFeatures = features.map(f => f.features);
    
    // Average recent features
    const avgFeatures = latestFeatures.reduce((acc, curr) => {
      Object.keys(curr).forEach(key => {
        if (typeof curr[key] === 'number') {
          acc[key] = (acc[key] || 0) + curr[key];
        }
      });
      return acc;
    }, {});

    Object.keys(avgFeatures).forEach(key => {
      avgFeatures[key] = avgFeatures[key] / latestFeatures.length;
    });

    // Calculate metrics from features
    if (avgFeatures.browserEngagementRatio !== undefined) {
      combined.engagement = Math.round(avgFeatures.browserEngagementRatio * 100);
    }

    if (avgFeatures.productivityScore !== undefined) {
      combined.productivity = avgFeatures.productivityScore;
    }

    // Estimate stress from activity patterns
    const clickRate = avgFeatures.browserClickRate || 0;
    const focusChanges = avgFeatures.browserFocusChanges || 0;
    combined.stress = Math.min(100, Math.round((clickRate * 10 + focusChanges * 5)));
  }

  // Include latest mood if available
  if (moods.length > 0) {
    const recentMoods = moods.map(m => m.mood);
    combined.mood = Math.round(recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length);
  }

  // Parse browser metrics if available
  if (browserSession?.metrics) {
    try {
      const browserMetrics = browserSession.metrics;
      if (browserMetrics.activeTime && browserMetrics.idleTime) {
        const totalTime = browserMetrics.activeTime + browserMetrics.idleTime;
        combined.engagement = Math.round((browserMetrics.activeTime / totalTime) * 100);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  return combined;
}

async function generatePredictions(metrics: any, userId: string) {
  const predictions: any = {
    mood: metrics.mood,
    stress: metrics.stress,
    productivityScore: metrics.productivity,
    focusQuality: Math.round((100 - metrics.stress) * 0.7 + metrics.engagement * 0.3),
    recommendations: []
  };

  // Try to get ML model predictions from Juan's model
  try {
    // Get latest model version
    const { data: registry } = await supabase
      .from('model_registry')
      .select('model_version, coefficients, intercept, features')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (registry) {
      // Get today's prediction if available
      const today = new Date().toISOString().slice(0, 10);
      const { data: prediction } = await supabase
        .from('model_predictions')
        .select('y_pred, y_true')
        .eq('model_version', registry.model_version)
        .eq('user_id', userId)
        .eq('day', today)
        .single();

      if (prediction) {
        predictions.mood = Math.round(prediction.y_pred);
        predictions.mlPrediction = prediction.y_pred;
        predictions.modelVersion = registry.model_version;
      }

      // Get feature importance for insights
      const { data: importance } = await supabase
        .from('model_feature_importance')
        .select('feature, importance')
        .eq('model_version', registry.model_version)
        .order('importance', { ascending: false })
        .limit(3);

      if (importance && importance.length > 0) {
        predictions.topFactors = importance;
      }
    }
  } catch (error) {
    console.error('Failed to get ML predictions:', error);
  }

  // Generate recommendations based on metrics
  if (metrics.stress > 70) {
    predictions.recommendations.push('Consider taking a short break to reduce stress');
  }

  if (metrics.engagement < 40) {
    predictions.recommendations.push('Try to minimize distractions and focus on one task');
  }

  if (metrics.productivity < 50) {
    predictions.recommendations.push('Break down tasks into smaller, manageable chunks');
  }

  if (metrics.mood < 3) {
    predictions.recommendations.push('Take a moment for a mood-boosting activity');
  }

  // If everything is good
  if (predictions.recommendations.length === 0) {
    predictions.recommendations.push('Great job! Keep up the good work');
  }

  return predictions;
}