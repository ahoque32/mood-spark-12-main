import supabase from '../db/client';
import { v4 as uuidv4 } from 'uuid';

export type EntrySource = 'SELF' | 'IMPORT' | 'INTEGRATION';

export interface MoodEntry {
  id: string;
  userId: string;
  mood: number;
  note: string | null;
  source: EntrySource;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMoodEntryData {
  userId: string;
  mood: number;
  note?: string;
  source: EntrySource;
}

export interface MoodQueryParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class MoodQueries {
  static async create(data: CreateMoodEntryData): Promise<MoodEntry> {
    const now = new Date().toISOString();
    const { data: moodEntry, error } = await supabase
      .from('mood_entries')
      .insert({
        id: uuidv4(),
        user_id: data.userId,
        mood_value: data.mood,
        notes: data.note || null,
        context: { source: data.source },
        timestamp: now,
        "createdAt": now,
        "updatedAt": now
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    // Transform back to expected interface format
    if (moodEntry) {
      return {
        id: moodEntry.id,
        userId: moodEntry.user_id,
        mood: moodEntry.mood_value,
        note: moodEntry.notes,
        source: moodEntry.context?.source || 'SELF',
        timestamp: moodEntry.timestamp,
        createdAt: moodEntry.createdAt,
        updatedAt: moodEntry.updatedAt
      };
    }
    throw new Error('Failed to create mood entry');
  }

  static async findById(id: string): Promise<MoodEntry | null> {
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    if (!data) return null;
    
    return {
      id: data.id,
      userId: data.user_id,
      mood: data.mood_value,
      note: data.notes,
      source: data.context?.source || 'SELF',
      timestamp: data.timestamp,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  static async findByUser(userId: string, params: MoodQueryParams = {}): Promise<MoodEntry[]> {
    let query = supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (params.startDate) {
      query = query.gte('timestamp', new Date(params.startDate).toISOString());
    }
    if (params.endDate) {
      query = query.lte('timestamp', new Date(params.endDate).toISOString());
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      mood: item.mood_value,
      note: item.notes,
      source: item.context?.source || 'SELF',
      timestamp: item.timestamp,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
  }

  static async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MoodEntry[]> {
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      mood: item.mood_value,
      note: item.notes,
      source: item.context?.source || 'SELF',
      timestamp: item.timestamp,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
  }

  static async update(id: string, data: { mood?: number; note?: string }): Promise<MoodEntry> {
    const updateData: any = { "updatedAt": new Date().toISOString() };
    if (data.mood !== undefined) updateData.mood_value = data.mood;
    if (data.note !== undefined) updateData.notes = data.note;
    
    const { data: moodEntry, error } = await supabase
      .from('mood_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      id: moodEntry.id,
      userId: moodEntry.user_id,
      mood: moodEntry.mood_value,
      note: moodEntry.notes,
      source: moodEntry.context?.source || 'SELF',
      timestamp: moodEntry.timestamp,
      createdAt: moodEntry.createdAt,
      updatedAt: moodEntry.updatedAt
    };
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('mood_entries')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  static async getAnalytics(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: moods, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw new Error(error.message);

    const rawMoodEntries = moods || [];
    const moodEntries = rawMoodEntries.map(item => ({
      id: item.id,
      userId: item.user_id,
      mood: item.mood_value,
      note: item.notes,
      source: item.context?.source || 'SELF',
      timestamp: item.timestamp,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
    
    const averageMood = moodEntries.length > 0 
      ? moodEntries.reduce((sum, entry) => sum + entry.mood, 0) / moodEntries.length 
      : 0;

    const moodCounts = moodEntries.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalEntries: moodEntries.length,
      averageMood: Math.round(averageMood * 100) / 100,
      moodDistribution: moodCounts,
      entries: moodEntries
    };
  }
}