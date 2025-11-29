-- Browser Sessions Table
CREATE TABLE IF NOT EXISTS public.browser_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ NOT NULL,
  metrics JSONB,
  activity_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Browser Activities Table  
CREATE TABLE IF NOT EXISTS public.browser_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES browser_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Feature Store Table (extends the existing one for browser features)
CREATE TABLE IF NOT EXISTS public.feature_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('BROWSER', 'SYSTEM', 'CALENDAR', 'ANALYZED')),
  features JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
CREATE POLICY "Users can view own browser sessions" ON public.browser_sessions
  FOR SELECT USING (user_id::text = auth.uid()::text OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own browser sessions" ON public.browser_sessions
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text OR auth.role() = 'service_role');

CREATE POLICY "Users can update own browser sessions" ON public.browser_sessions
  FOR UPDATE USING (user_id::text = auth.uid()::text OR auth.role() = 'service_role');

-- RLS Policies for browser_activities
CREATE POLICY "Users can view own browser activities" ON public.browser_activities
  FOR SELECT USING (user_id::text = auth.uid()::text OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own browser activities" ON public.browser_activities
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text OR auth.role() = 'service_role');

-- RLS Policies for feature_store
CREATE POLICY "Users can view own features" ON public.feature_store
  FOR SELECT USING (user_id::text = auth.uid()::text OR auth.role() = 'service_role');

CREATE POLICY "Users can insert own features" ON public.feature_store
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text OR auth.role() = 'service_role');

-- Add ANALYZED to the entry_source enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ANALYZED' AND enumtypid = 'entry_source'::regtype) THEN
    ALTER TYPE entry_source ADD VALUE 'ANALYZED';
  END IF;
END $$;