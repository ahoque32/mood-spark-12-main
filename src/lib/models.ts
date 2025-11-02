export type Mood = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id: string;
  timestamp: string;
  mood: Mood;
  note?: string;
  source: 'self' | 'analyzed';
}

export interface Settings {
  analyzeTone: boolean;
  correlateSocial: boolean;
  shareWithTherapist: boolean;
}

export interface WeeklySummary {
  daysCalmer: number;
  narrative: string;
}

export interface TrendPoint {
  day: string;
  selfMood: number;
  analyzedSentiment: number;
}
