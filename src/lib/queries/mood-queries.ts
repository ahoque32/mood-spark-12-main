import { MoodEntry, EntrySource } from '@prisma/client';
import prisma from '../db/client';

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
    return prisma.moodEntry.create({
      data: {
        userId: data.userId,
        mood: data.mood,
        note: data.note,
        source: data.source,
      }
    });
  }

  static async findById(id: string): Promise<MoodEntry | null> {
    return prisma.moodEntry.findUnique({
      where: { id }
    });
  }

  static async findByUser(userId: string, params: MoodQueryParams = {}): Promise<MoodEntry[]> {
    const where: any = { userId };
    
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        where.timestamp.lte = new Date(params.endDate);
      }
    }

    return prisma.moodEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params.limit,
      skip: params.offset,
    });
  }

  static async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MoodEntry[]> {
    return prisma.moodEntry.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        }
      },
      orderBy: { timestamp: 'desc' }
    });
  }

  static async update(id: string, data: { mood?: number; note?: string }): Promise<MoodEntry> {
    return prisma.moodEntry.update({
      where: { id },
      data
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.moodEntry.delete({
      where: { id }
    });
  }

  static async getAnalytics(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const moods = await prisma.moodEntry.findMany({
      where: {
        userId,
        timestamp: { gte: startDate }
      },
      orderBy: { timestamp: 'asc' }
    });

    const averageMood = moods.length > 0 
      ? moods.reduce((sum, entry) => sum + entry.mood, 0) / moods.length 
      : 0;

    const moodCounts = moods.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalEntries: moods.length,
      averageMood: Math.round(averageMood * 100) / 100,
      moodDistribution: moodCounts,
      entries: moods
    };
  }
}