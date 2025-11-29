import 'dotenv/config';
import { supabase } from '../src/lib/db/client';

async function checkTables() {
  console.log('Checking Supabase tables...\n');

  // List of tables to check
  const tablesToCheck = [
    // Original tables from schema.sql
    'users',
    'user_settings',
    'sessions',
    'mood_entries',
    
    // Juan's ML tables from schema_feature_store.sql
    'system_events',
    'daily_features',
    'model_registry',
    'model_feature_importance',
    'model_predictions',
    
    // New browser tracking tables
    'browser_sessions',
    'browser_activities',
    'feature_store'
  ];

  for (const table of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: NOT FOUND or ERROR - ${error.message}`);
      } else {
        console.log(`✅ ${table}: EXISTS (${count} rows)`);
      }
    } catch (e) {
      console.log(`❌ ${table}: ERROR - ${e}`);
    }
  }

  // Check for enum types
  console.log('\nChecking enum types...');
  try {
    // Try to query mood_entries with source column to check if entry_source enum exists
    const { data, error } = await supabase
      .from('mood_entries')
      .select('source')
      .limit(1);
    
    if (!error) {
      console.log('✅ entry_source enum: EXISTS');
    } else {
      console.log('❌ entry_source enum: ERROR - ', error.message);
    }
  } catch (e) {
    console.log('❌ entry_source enum: ERROR - ', e);
  }
}

checkTables().then(() => {
  console.log('\nTable check complete!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});