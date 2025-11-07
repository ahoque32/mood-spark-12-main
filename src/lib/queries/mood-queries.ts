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
    const { data: moodEntry, error } = await supabase
      .from('MoodEntry')
      .insert({
        id: uuidv4(),
        userId: data.userId,
        mood: data.mood,
        note: data.note || null,
        source: data.source,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return moodEntry;
  }

  static async findById(id: string): Promise<MoodEntry | null> {
    const { data, error } = await supabase
      .from('MoodEntry')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  static async findByUser(userId: string, params: MoodQueryParams = {}): Promise<MoodEntry[]> {
    let query = supabase
      .from('MoodEntry')
      .select('*')
      .eq('userId', userId)
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
    return data || [];
  }

  static async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MoodEntry[]> {
    const { data, error } = await supabase
      .from('MoodEntry')
      .select('*')
      .eq('userId', userId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async update(id: string, data: { mood?: number; note?: string }): Promise<MoodEntry> {
    const { data: moodEntry, error } = await supabase
      .from('MoodEntry')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return moodEntry;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('MoodEntry')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  static async getAnalytics(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: moods, error } = await supabase
      .from('MoodEntry')
      .select('*')
      .eq('userId', userId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw new Error(error.message);

    const moodEntries = moods || [];
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