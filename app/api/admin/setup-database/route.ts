import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Setting up database schema...');

    // Execute individual table creation queries to avoid schema cache issues
    const tables = [
      {
        name: 'calendar_tokens',
        sql: `
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
          DROP POLICY IF EXISTS "Users can manage their calendar tokens" ON calendar_tokens;
          CREATE POLICY "Users can manage their calendar tokens" ON calendar_tokens
          FOR ALL TO authenticated USING ("userId" = auth.uid()::text);
        `
      },
      {
        name: 'feature_store', 
        sql: `
          CREATE TABLE IF NOT EXISTS feature_store (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id text NOT NULL,
            timestamp timestamp with time zone DEFAULT now(),
            source text NOT NULL CHECK (source IN ('BROWSER', 'SYSTEM', 'CALENDAR', 'MOOD')),
            features jsonb NOT NULL,
            "createdAt" timestamp with time zone DEFAULT now()
          );
          ALTER TABLE feature_store ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Users can manage their features" ON feature_store;
          CREATE POLICY "Users can manage their features" ON feature_store
          FOR ALL TO authenticated USING (user_id = auth.uid()::text);
        `
      },
      {
        name: 'browser_sessions',
        sql: `
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
          DROP POLICY IF EXISTS "Users can manage their browser sessions" ON browser_sessions;
          CREATE POLICY "Users can manage their browser sessions" ON browser_sessions
          FOR ALL TO authenticated USING (user_id = auth.uid()::text);
        `
      },
      {
        name: 'browser_activities',
        sql: `
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
          DROP POLICY IF EXISTS "Users can manage their browser activities" ON browser_activities;
          CREATE POLICY "Users can manage their browser activities" ON browser_activities
          FOR ALL TO authenticated USING (user_id = auth.uid()::text);
        `
      },
      {
        name: 'mood_entries',
        sql: `
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
          DROP POLICY IF EXISTS "Users can manage their mood entries" ON mood_entries;
          CREATE POLICY "Users can manage their mood entries" ON mood_entries
          FOR ALL TO authenticated USING (user_id = auth.uid()::text);
        `
      },
      {
        name: 'daily_features',
        sql: `
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
          DROP POLICY IF EXISTS "Users can manage their daily features" ON daily_features;
          CREATE POLICY "Users can manage their daily features" ON daily_features
          FOR ALL TO authenticated USING (user_id = auth.uid()::text);
        `
      }
    ];

    const results = [];

    // Execute each table creation sequentially
    for (const table of tables) {
      console.log(`Creating table: ${table.name}`);
      
      try {
        // Try using direct SQL execution
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
          },
          body: JSON.stringify({ sql: table.sql })
        });

        if (response.ok) {
          console.log(`✅ Created table: ${table.name}`);
          results.push({ table: table.name, status: 'success' });
        } else {
          const errorData = await response.text();
          console.log(`⚠️ Table ${table.name} creation response:`, errorData);
          results.push({ table: table.name, status: 'warning', details: errorData });
        }
      } catch (error) {
        console.error(`❌ Error creating table ${table.name}:`, error);
        results.push({ table: table.name, status: 'error', error: error.message });
      }
    }

    // Create indexes
    const indexSql = `
      CREATE INDEX IF NOT EXISTS idx_calendar_tokens_user_provider ON calendar_tokens("userId", provider);
      CREATE INDEX IF NOT EXISTS idx_feature_store_user_timestamp ON feature_store(user_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_browser_sessions_user ON browser_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_browser_sessions_session_id ON browser_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_browser_activities_session ON browser_activities(session_id);
      CREATE INDEX IF NOT EXISTS idx_browser_activities_user_type ON browser_activities(user_id, activity_type);
      CREATE INDEX IF NOT EXISTS idx_mood_entries_user_timestamp ON mood_entries(user_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_daily_features_user_date ON daily_features(user_id, date);
    `;

    try {
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        },
        body: JSON.stringify({ sql: indexSql })
      });
      
      if (response.ok) {
        console.log('✅ Created indexes');
        results.push({ table: 'indexes', status: 'success' });
      }
    } catch (error) {
      console.log('⚠️ Index creation failed:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup completed',
      results,
      manualSql: `
-- If automatic creation failed, run this SQL manually in Supabase SQL Editor:

${tables.map(t => t.sql).join('\n\n')}

-- Indexes:
${indexSql}

-- Refresh schema cache:
NOTIFY pgrst, 'reload schema';
      `
    });

  } catch (error) {
    console.error('Database setup failed:', error);
    return NextResponse.json(
      { 
        error: 'Database setup failed', 
        details: error.message,
        instruction: 'Please run the SQL manually in Supabase SQL Editor'
      },
      { status: 500 }
    );
  }
}