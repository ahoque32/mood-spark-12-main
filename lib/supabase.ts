import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          name: string | null
          token_version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          name?: string | null
          token_version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          name?: string | null
          token_version?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          analyze_tone: boolean
          correlate_social: boolean
          share_with_therapist: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          analyze_tone?: boolean
          correlate_social?: boolean
          share_with_therapist?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          analyze_tone?: boolean
          correlate_social?: boolean
          share_with_therapist?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          refresh_token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          refresh_token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          refresh_token?: string
          expires_at?: string
          created_at?: string
        }
      }
      mood_entries: {
        Row: {
          id: string
          user_id: string
          mood: number
          note: string | null
          source: 'SELF' | 'IMPORT' | 'INTEGRATION'
          timestamp: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mood: number
          note?: string | null
          source?: 'SELF' | 'IMPORT' | 'INTEGRATION'
          timestamp?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mood?: number
          note?: string | null
          source?: 'SELF' | 'IMPORT' | 'INTEGRATION'
          timestamp?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}