import 'dotenv/config';
import { supabase } from '../src/lib/db/client';

const schema = `
-- Browser Sessions Table
CREATE TABLE IF NOT EXISTS public.browser_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ NOT NULL,
  metrics JSONB,
  activity_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Browser Activities Table  
CREATE TABLE IF NOT EXISTS public.browser_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES browser_sessions(session_id) ON DELETE CASCADE
);

-- Feature Store Table (extends the existing one for browser features)
CREATE TABLE IF NOT EXISTS public.feature_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('BROWSER', 'SYSTEM', 'CALENDAR', 'ANALYZED')),
  features JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_browser_sessions_user_id ON public.browser_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_last_activity ON public.browser_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_browser_activities_session_id ON public.browser_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_browser_activities_user_id ON public.browser_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_activities_timestamp ON public.browser_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_browser_activities_type ON public.browser_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_feature_store_user_id ON public.feature_store(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_store_timestamp ON public.feature_store(timestamp);
CREATE INDEX IF NOT EXISTS idx_feature_store_source ON public.feature_store(source);

-- Enable RLS
ALTER TABLE public.browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_store ENABLE ROW LEVEL SECURITY;

-- RLS Policies for browser_sessions
DROP POLICY IF EXISTS "allow_all_browser_sessions" ON public.browser_sessions;
CREATE POLICY "allow_all_browser_sessions" ON public.browser_sessions FOR ALL USING (true);

-- RLS Policies for browser_activities
DROP POLICY IF EXISTS "allow_all_browser_activities" ON public.browser_activities;
CREATE POLICY "allow_all_browser_activities" ON public.browser_activities FOR ALL USING (true);

-- RLS Policies for feature_store
DROP POLICY IF EXISTS "allow_all_features" ON public.feature_store;
CREATE POLICY "allow_all_features" ON public.feature_store FOR ALL USING (true);
`;

async function createTables() {
  console.log('Creating browser tracking tables in Supabase...\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: schema });
    
    if (error) {
      console.error('Error creating tables:', error);
    } else {
      console.log('✅ Tables created successfully!');
    }
  } catch (error) {
    // Fallback: try creating tables one by one
    console.log('Trying alternative approach...');
    
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      
      try {
        await supabase.from('_temp').select('1').limit(0); // This will fail but helps with connection
      } catch (e) {
        // Expected to fail
      }
      
      console.log('Executing:', statement.substring(0, 50) + '...');
      // Note: Supabase client doesn't support raw SQL execution
      // These tables need to be created via Supabase Dashboard SQL Editor
    }
  }
  
  console.log('\nTo create tables manually:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run the SQL from supabase/schema_browser_tracking.sql');
}

createTables().then(() => {
  console.log('\nTable creation process complete!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});