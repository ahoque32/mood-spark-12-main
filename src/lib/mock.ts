import { addDays, startOfWeek, format } from 'date-fns';
import { MoodEntry, TrendPoint, WeeklySummary } from './models';

export function generateMockWeek() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const labels = Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'EEE'));
  const analyzed = [2.8, 3.5, 3.2, 4.0, 3.9, 4.6, 4.2];
  const self = [2.5, 3.1, 2.9, 3.8, 4.1, 4.5, 4.0];

  const trend: TrendPoint[] = labels.map((d, i) => ({
    day: d,
    analyzedSentiment: Math.round(analyzed[i]),
    selfMood: Math.round(self[i])
  }));

  const entries: MoodEntry[] = trend.map((t, i) => ({
    id: crypto.randomUUID(),
    timestamp: addDays(start, i).toISOString(),
    mood: t.selfMood as 1 | 2 | 3 | 4 | 5,
    source: 'self'
  }));

  return { trend, entries };
}

export function summarizeWeek(trend: TrendPoint[]): WeeklySummary {
  const calmerDays = trend.filter(t => t.analyzedSentiment >= t.selfMood).length;
  return {
    daysCalmer: calmerDays,
    narrative: `You've felt calmer ${calmerDays} of 7 days this week. Your message tone has been mostly positive, aligning well with your self-reported mood.`
  };
}
