import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Checking and creating missing database tables...');
    
    // List of tables we need
    const requiredTables = [
      'calendar_tokens',
      'feature_store', 
      'browser_sessions',
      'browser_activities',
      'mood_entries',
      'daily_features'
    ];

    const results = [];
    
    // Check each table and create if missing
    for (const tableName of requiredTables) {
      try {
        // Try to query the table to see if it exists
        const { error: queryError } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);

        if (queryError && queryError.message.includes('does not exist')) {
          console.log(`❌ Table '${tableName}' missing, creating...`);
          
          // Create the table based on the table name
          const createResult = await createTable(tableName);
          results.push({ table: tableName, status: 'created', result: createResult });
        } else {
          console.log(`✅ Table '${tableName}' exists`);
          results.push({ table: tableName, status: 'exists' });
        }
      } catch (error) {
        console.error(`Error checking table ${tableName}:`, error);
        results.push({ table: tableName, status: 'error', error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database table check completed',
      results
    });

  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json(
      { error: 'Failed to setup database tables', details: error.message },
      { status: 500 }
    );
  }
}

async function createTable(tableName: string) {
  const tableSchemas = {
    calendar_tokens: `
      CREATE TABLE calendar_tokens (
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
    `,
    
    feature_store: `
      CREATE TABLE feature_store (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        timestamp timestamp with time zone DEFAULT now(),
        source text NOT NULL CHECK (source IN ('BROWSER', 'SYSTEM', 'CALENDAR', 'MOOD')),
        features jsonb NOT NULL,
        "createdAt" timestamp with time zone DEFAULT now()
      );
    `,
    
    browser_sessions: `
      CREATE TABLE browser_sessions (
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
    `,
    
    browser_activities: `
      CREATE TABLE browser_activities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id text NOT NULL,
        user_id text,
        activity_type text NOT NULL,
        timestamp timestamp with time zone DEFAULT now(),
        data jsonb,
        "createdAt" timestamp with time zone DEFAULT now()
      );
    `,
    
    mood_entries: `
      CREATE TABLE mood_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        mood_value integer NOT NULL CHECK (mood_value BETWEEN 1 AND 10),
        timestamp timestamp with time zone DEFAULT now(),
        notes text,
        context jsonb,
        "createdAt" timestamp with time zone DEFAULT now(),
        "updatedAt" timestamp with time zone DEFAULT now()
      );
    `,
    
    daily_features: `
      CREATE TABLE daily_features (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        date date NOT NULL,
        features jsonb NOT NULL,
        mood_score numeric,
        "createdAt" timestamp with time zone DEFAULT now(),
        UNIQUE(user_id, date)
      );
    `
  };

  const schema = tableSchemas[tableName];
  if (!schema) {
    throw new Error(`Unknown table: ${tableName}`);
  }

  // Use direct SQL execution
  const { error } = await supabase.rpc('exec', { sql: schema });
  
  if (error) {
    console.error(`Failed to create table ${tableName}:`, error);
    // Return info for manual creation
    return {
      success: false,
      error: error.message,
      sql: schema
    };
  }

  console.log(`✅ Successfully created table: ${tableName}`);
  return { success: true };
}