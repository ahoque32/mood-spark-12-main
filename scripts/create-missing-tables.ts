import { supabase } from '../src/lib/db/client';

async function createMissingTables() {
  console.log('🔍 Checking existing tables...');
  
  // First, check which tables already exist
  const { data: existingTables, error: tablesError } = await supabase.rpc('get_table_names');
  
  if (tablesError) {
    console.log('Using alternative method to check tables...');
    // Alternative approach - try to query each table
    const tablesToCheck = [
      'calendar_tokens',
      'feature_store', 
      'browser_sessions',
      'browser_activities',
      'mood_entries',
      'daily_features'
    ];

    const missingTables = [];
    
    for (const tableName of tablesToCheck) {
      try {
        await supabase.from(tableName).select('id').limit(1);
        console.log(`✅ Table '${tableName}' exists`);
      } catch (error) {
        console.log(`❌ Table '${tableName}' missing`);
        missingTables.push(tableName);
      }
    }
    
    await createTables(missingTables);
  } else {
    console.log('📋 Existing tables:', existingTables);
    await createAllTables();
  }
}

async function createTables(missingTables: string[]) {
  console.log('\n🔨 Creating missing tables...');
  
  const tableCreationQueries = {
    'calendar_tokens': `
      CREATE TABLE IF NOT EXISTS calendar_tokens (
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
      ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can manage their calendar tokens" ON calendar_tokens
      FOR ALL TO authenticated USING ("userId" = auth.uid()::text);
      CREATE INDEX IF NOT EXISTS idx_calendar_tokens_user_provider ON calendar_tokens("userId", provider);
    `,
    
    'feature_store': `
      CREATE TABLE IF NOT EXISTS feature_store (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        timestamp timestamp with time zone DEFAULT now(),
        source text NOT NULL CHECK (source IN ('BROWSER', 'SYSTEM', 'CALENDAR', 'MOOD')),
        features jsonb NOT NULL,
        "createdAt" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE feature_store ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can manage their features" ON feature_store
      FOR ALL TO authenticated USING (user_id = auth.uid()::text);
      CREATE INDEX IF NOT EXISTS idx_feature_store_user_timestamp ON feature_store(user_id, timestamp);
    `,
    
    'browser_sessions': `
      CREATE TABLE IF NOT EXISTS browser_sessions (
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
      ALTER TABLE browser_sessions ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can manage their browser sessions" ON browser_sessions
      FOR ALL TO authenticated USING (user_id = auth.uid()::text);
      CREATE INDEX IF NOT EXISTS idx_browser_sessions_user ON browser_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_browser_sessions_session_id ON browser_sessions(session_id);
    `,
    
    'browser_activities': `
      CREATE TABLE IF NOT EXISTS browser_activities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id text NOT NULL,
        user_id text,
        activity_type text NOT NULL,
        timestamp timestamp with time zone DEFAULT now(),
        data jsonb,
        "createdAt" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE browser_activities ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can manage their browser activities" ON browser_activities
      FOR ALL TO authenticated USING (user_id = auth.uid()::text);
      CREATE INDEX IF NOT EXISTS idx_browser_activities_session ON browser_activities(session_id);
      CREATE INDEX IF NOT EXISTS idx_browser_activities_user_type ON browser_activities(user_id, activity_type);
    `,
    
    'mood_entries': `
      CREATE TABLE IF NOT EXISTS mood_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        mood_value integer NOT NULL CHECK (mood_value BETWEEN 1 AND 10),
        timestamp timestamp with time zone DEFAULT now(),
        notes text,
        context jsonb,
        "createdAt" timestamp with time zone DEFAULT now(),
        "updatedAt" timestamp with time zone DEFAULT now()
      );
      ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can manage their mood entries" ON mood_entries
      FOR ALL TO authenticated USING (user_id = auth.uid()::text);
      CREATE INDEX IF NOT EXISTS idx_mood_entries_user_timestamp ON mood_entries(user_id, timestamp);
    `,
    
    'daily_features': `
      CREATE TABLE IF NOT EXISTS daily_features (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        date date NOT NULL,
        features jsonb NOT NULL,
        mood_score numeric,
        "createdAt" timestamp with time zone DEFAULT now(),
        UNIQUE(user_id, date)
      );
      ALTER TABLE daily_features ENABLE ROW LEVEL SECURITY;
      CREATE POLICY "Users can manage their daily features" ON daily_features
      FOR ALL TO authenticated USING (user_id = auth.uid()::text);
      CREATE INDEX IF NOT EXISTS idx_daily_features_user_date ON daily_features(user_id, date);
    `
  };

  for (const tableName of missingTables) {
    if (tableCreationQueries[tableName]) {
      console.log(`🔨 Creating table: ${tableName}`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: tableCreationQueries[tableName]
      });
      
      if (error) {
        console.error(`❌ Error creating ${tableName}:`, error);
        // Try alternative method
        console.log(`🔄 Trying direct SQL execution for ${tableName}...`);
        const { error: directError } = await supabase.from('_supabase_migrations').select('*').limit(1);
        
        if (directError) {
          console.log(`ℹ️  Creating ${tableName} with direct query...`);
          // Use raw SQL if RPC is not available
          try {
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
              },
              body: JSON.stringify({ sql: tableCreationQueries[tableName] })
            });
            
            if (response.ok) {
              console.log(`✅ Successfully created ${tableName}`);
            } else {
              console.log(`⚠️  Manual creation needed for ${tableName}`);
            }
          } catch (fetchError) {
            console.log(`⚠️  Could not create ${tableName} automatically`);
          }
        }
      } else {
        console.log(`✅ Successfully created ${tableName}`);
      }
    }
  }
}

async function createAllTables() {
  console.log('\n🔨 Creating all required tables...');
  
  const allTables = [
    'calendar_tokens',
    'feature_store', 
    'browser_sessions',
    'browser_activities',
    'mood_entries',
    'daily_features'
  ];
  
  await createTables(allTables);
}

// Run the script
createMissingTables()
  .then(() => {
    console.log('\n🎉 Database setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database setup failed:', error);
    console.log('\n📝 Manual SQL needed. Please run this in Supabase SQL Editor:');
    console.log(`
-- Calendar Tokens Table
CREATE TABLE IF NOT EXISTS calendar_tokens (
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

-- Feature Store Table
CREATE TABLE IF NOT EXISTS feature_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  source text NOT NULL CHECK (source IN ('BROWSER', 'SYSTEM', 'CALENDAR', 'MOOD')),
  features jsonb NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now()
);

-- Browser Sessions Table
CREATE TABLE IF NOT EXISTS browser_sessions (
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

-- Browser Activities Table
CREATE TABLE IF NOT EXISTS browser_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id text,
  activity_type text NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  data jsonb,
  "createdAt" timestamp with time zone DEFAULT now()
);

-- Mood Entries Table
CREATE TABLE IF NOT EXISTS mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  mood_value integer NOT NULL CHECK (mood_value BETWEEN 1 AND 10),
  timestamp timestamp with time zone DEFAULT now(),
  notes text,
  context jsonb,
  "createdAt" timestamp with time zone DEFAULT now(),
  "updatedAt" timestamp with time zone DEFAULT now()
);

-- Daily Features Table
CREATE TABLE IF NOT EXISTS daily_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  features jsonb NOT NULL,
  mood_score numeric,
  "createdAt" timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS and create policies (run these one by one)
ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE browser_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_features ENABLE ROW LEVEL SECURITY;
`);
    process.exit(1);
  });