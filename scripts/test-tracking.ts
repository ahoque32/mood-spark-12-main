import 'dotenv/config';
import { supabase } from '../src/lib/db/client';

async function testTracking() {
  console.log('Testing tracking functionality...\n');

  // 1. Check browser sessions
  console.log('=== Browser Sessions ===');
  const { data: sessions, error: sessionsError } = await supabase
    .from('browser_sessions')
    .select('session_id, user_id, last_activity, activity_count')
    .order('last_activity', { ascending: false })
    .limit(5);
  
  if (sessionsError) {
    console.log('Error fetching browser sessions:', sessionsError);
  } else {
    console.log(`Found ${sessions?.length || 0} browser sessions:`);
    sessions?.forEach(s => {
      console.log(`  - Session ${s.session_id.substring(0, 20)}... | User: ${s.user_id.substring(0, 15)}... | Activities: ${s.activity_count} | Last: ${s.last_activity}`);
    });
  }

  // 2. Check browser activities
  console.log('\n=== Browser Activities ===');
  const { data: activities, count } = await supabase
    .from('browser_activities')
    .select('activity_type', { count: 'exact' })
    .limit(0);
  
  console.log(`Total browser activities recorded: ${count || 0}`);
  
  if (count && count > 0) {
    // Get recent activities
    const { data: recentActivities } = await supabase
      .from('browser_activities')
      .select('activity_type, timestamp, session_id')
      .order('timestamp', { ascending: false })
      .limit(10);
    
    console.log('Recent activities:');
    recentActivities?.forEach(a => {
      const time = new Date(a.timestamp).toLocaleString();
      console.log(`  - ${a.activity_type} at ${time}`);
    });
  }

  // 3. Check feature store
  console.log('\n=== Feature Store ===');
  const { data: features, error: featuresError } = await supabase
    .from('feature_store')
    .select('source, user_id, timestamp')
    .order('timestamp', { ascending: false })
    .limit(5);
  
  if (featuresError) {
    console.log('Error fetching features:', featuresError);
  } else {
    console.log(`Found ${features?.length || 0} feature records:`);
    const bySource: any = {};
    features?.forEach(f => {
      bySource[f.source] = (bySource[f.source] || 0) + 1;
    });
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`  - ${source}: ${count} records`);
    });
  }

  // 4. Check ML model status
  console.log('\n=== ML Model Status ===');
  const { data: models } = await supabase
    .from('model_registry')
    .select('model_version, train_mae, created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (models?.length) {
    const model = models[0];
    console.log(`Latest model: ${model.model_version}`);
    console.log(`Training MAE: ${model.train_mae}`);
    console.log(`Created: ${model.created_at}`);
  } else {
    console.log('No ML models found');
  }

  // 5. Check recent predictions
  console.log('\n=== Recent Predictions ===');
  const { data: predictions } = await supabase
    .from('model_predictions')
    .select('day, y_true, y_pred')
    .order('day', { ascending: false })
    .limit(5);
  
  if (predictions?.length) {
    console.log('Recent mood predictions:');
    predictions.forEach(p => {
      console.log(`  - ${p.day}: Actual=${p.y_true || 'N/A'}, Predicted=${p.y_pred}`);
    });
  } else {
    console.log('No predictions found');
  }

  // 6. Test API endpoints
  console.log('\n=== API Endpoints ===');
  
  // Test browser tracking endpoint
  try {
    const testData = {
      sessionId: `test_${Date.now()}`,
      userId: 'test_user',
      activities: [
        { type: 'test_activity', timestamp: Date.now(), data: { test: true } }
      ],
      metrics: { activeTime: 1000, idleTime: 500 },
      timestamp: new Date().toISOString()
    };

    const response = await fetch('http://localhost:3000/api/tracking/browser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      console.log('✅ Browser tracking API: Working');
    } else {
      console.log('❌ Browser tracking API: Failed -', response.status);
    }
  } catch (error) {
    console.log('❌ Browser tracking API: Error -', error);
  }

  // Test realtime endpoint
  try {
    const response = await fetch('http://localhost:3000/api/tracking/realtime');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Realtime API: Working');
      console.log(`   - Mood: ${data.mood}, Productivity: ${data.productivity}, Engagement: ${data.engagement}`);
    } else {
      console.log('❌ Realtime API: Failed -', response.status);
    }
  } catch (error) {
    console.log('❌ Realtime API: Error -', error);
  }
}

testTracking().then(() => {
  console.log('\nTracking test complete!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});