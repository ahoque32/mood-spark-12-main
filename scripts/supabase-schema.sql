-- ==========================================
-- MOOD SPARK TRACKING TABLES SCHEMA
-- ==========================================
-- Execute this SQL in Supabase SQL Editor
-- These tables are required for the tracking system

-- 1. Calendar Tokens Table (for OAuth tokens)
CREATE TABLE IF NOT EXISTS public.calendar_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" text NOT NULL,
    provider text NOT NULL CHECK (provider IN ('google', 'outlook')),
    "accessToken" text NOT NULL,
    "refreshToken" text,
    "expiryDate" bigint,
    scope text NOT NULL DEFAULT '',
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now(),
    UNIQUE("userId", provider)
);

-- 2. Feature Store Table (for ML model features)
CREATE TABLE IF NOT EXISTS public.feature_store (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    timestamp timestamp with time zone DEFAULT now(),
    source text NOT NULL CHECK (source IN ('BROWSER', 'SYSTEM', 'CALENDAR', 'MOOD')),
    features jsonb NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 3. Browser Sessions Table
CREATE TABLE IF NOT EXISTS public.browser_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL UNIQUE,
    user_id text,
    start_time timestamp with time zone DEFAULT now(),
    end_time timestamp with time zone,
    is_active boolean DEFAULT true,
    user_agent text,
    platform text,
    tab_count integer DEFAULT 1,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);

-- 4. Browser Activities Table
CREATE TABLE IF NOT EXISTS public.browser_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    user_id text,
    activity_type text NOT NULL,
    timestamp timestamp with time zone DEFAULT now(),
    data jsonb,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 5. Mood Entries Table (snake_case version for API compatibility)
CREATE TABLE IF NOT EXISTS public.mood_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    mood_value integer NOT NULL CHECK (mood_value BETWEEN 1 AND 10),
    timestamp timestamp with time zone DEFAULT now(),
    notes text,
    context jsonb,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);

-- 6. Daily Features Table (for ML model training)
CREATE TABLE IF NOT EXISTS public.daily_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    date date NOT NULL,
    features jsonb NOT NULL,
    mood_score numeric,
    "createdAt" timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, date)
);

-- ==========================================
-- ROW LEVEL SECURITY SETUP
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_features ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
CREATE POLICY IF NOT EXISTS "Users can manage their calendar tokens" 
ON public.calendar_tokens FOR ALL TO authenticated 
USING ("userId" = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can manage their features" 
ON public.feature_store FOR ALL TO authenticated 
USING (user_id = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can manage their browser sessions" 
ON public.browser_sessions FOR ALL TO authenticated 
USING (user_id = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can manage their browser activities" 
ON public.browser_activities FOR ALL TO authenticated 
USING (user_id = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can manage their mood entries" 
ON public.mood_entries FOR ALL TO authenticated 
USING (user_id = auth.uid()::text);

CREATE POLICY IF NOT EXISTS "Users can manage their daily features" 
ON public.daily_features FOR ALL TO authenticated 
USING (user_id = auth.uid()::text);

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Calendar tokens indexes
CREATE INDEX IF NOT EXISTS idx_calendar_tokens_user_provider 
ON public.calendar_tokens("userId", provider);

-- Feature store indexes
CREATE INDEX IF NOT EXISTS idx_feature_store_user_timestamp 
ON public.feature_store(user_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_feature_store_source 
ON public.feature_store(source);

-- Browser sessions indexes
CREATE INDEX IF NOT EXISTS idx_browser_sessions_user 
ON public.browser_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_browser_sessions_session_id 
ON public.browser_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_browser_sessions_active 
ON public.browser_sessions(is_active);

-- Browser activities indexes
CREATE INDEX IF NOT EXISTS idx_browser_activities_session 
ON public.browser_activities(session_id);

CREATE INDEX IF NOT EXISTS idx_browser_activities_user_type 
ON public.browser_activities(user_id, activity_type);

CREATE INDEX IF NOT EXISTS idx_browser_activities_timestamp 
ON public.browser_activities(timestamp);

-- Mood entries indexes
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_timestamp 
ON public.mood_entries(user_id, timestamp);

-- Daily features indexes
CREATE INDEX IF NOT EXISTS idx_daily_features_user_date 
ON public.daily_features(user_id, date);

-- ==========================================
-- GRANT PERMISSIONS (if needed)
-- ==========================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant table permissions
GRANT ALL ON public.calendar_tokens TO authenticated;
GRANT ALL ON public.feature_store TO authenticated;
GRANT ALL ON public.browser_sessions TO authenticated;
GRANT ALL ON public.browser_activities TO authenticated;
GRANT ALL ON public.mood_entries TO authenticated;
GRANT ALL ON public.daily_features TO authenticated;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Run these to verify the tables were created correctly:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('calendar_tokens', 'feature_store', 'browser_sessions', 'browser_activities', 'mood_entries', 'daily_features');

-- ==========================================
-- SCHEMA COMPLETE
-- ==========================================

NOTIFY pgrst, 'reload schema';