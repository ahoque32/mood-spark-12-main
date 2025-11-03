import { MoodEntry } from '@prisma/client';
import { MoodQueries, CreateMoodEntryData, MoodQueryParams } from '../queries/mood-queries';

export class MoodService {
  static async createMoodEntry(userId: string, data: { mood: number; note?: string }): Promise<MoodEntry> {
    const entryData: CreateMoodEntryData = {
      userId,
      mood: data.mood,
      note: data.note,
      source: 'SELF'
    };
    
    return MoodQueries.create(entryData);
  }

  static async getMoodEntries(userId: string, params: MoodQueryParams = {}): Promise<MoodEntry[]> {
    return MoodQueries.findByUser(userId, params);
  }

  static async getMoodById(id: string): Promise<MoodEntry | null> {
    return MoodQueries.findById(id);
  }

  static async updateMoodEntry(id: string, data: { mood?: number; note?: string }): Promise<MoodEntry> {
    return MoodQueries.update(id, data);
  }

  static async deleteMoodEntry(id: string): Promise<void> {
    return MoodQueries.delete(id);
  }

  static async getMoodsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MoodEntry[]> {
    return MoodQueries.findByDateRange(userId, startDate, endDate);
  }

  static async getMoodAnalytics(userId: string, days: number = 30) {
    return MoodQueries.getAnalytics(userId, days);
  }
}