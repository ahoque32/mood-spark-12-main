import { create } from 'zustand';
import { MoodEntry, Settings, WeeklySummary, TrendPoint, Mood } from './models';
import { loadJSON, saveJSON } from './storage';
import { generateMockWeek, summarizeWeek } from './mock';

type State = {
  settings: Settings;
  entries: MoodEntry[];
  trend: TrendPoint[];
  summary: WeeklySummary | null;
  init: () => void;
  addEntry: (mood: Mood, note?: string) => void;
  setSettings: (partial: Partial<Settings>) => void;
};

export const useAppStore = create<State>((set, get) => ({
  settings: loadJSON<Settings>('settings') ?? {
    analyzeTone: false,
    correlateSocial: false,
    shareWithTherapist: false
  },
  entries: loadJSON<MoodEntry[]>('entries') ?? [],
  trend: loadJSON<TrendPoint[]>('trend') ?? [],
  summary: loadJSON<WeeklySummary>('summary') ?? null,

  init: () => {
    if (!get().trend.length) {
      const { trend, entries } = generateMockWeek();
      const summary = summarizeWeek(trend);
      set({ trend, entries: [...get().entries, ...entries], summary });
      saveJSON('trend', trend);
      saveJSON('entries', get().entries);
      saveJSON('summary', summary);
    }
  },

  addEntry: (mood, note) => {
    const entry: MoodEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      mood,
      note,
      source: 'self'
    };
    const entries = [entry, ...get().entries];
    saveJSON('entries', entries);
    
    const trend = [...get().trend];
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    const idx = trend.findIndex(t => t.day.startsWith(today.slice(0, 3)));
    if (idx >= 0) trend[idx].selfMood = mood;
    
    const summary = summarizeWeek(trend);
    saveJSON('trend', trend);
    saveJSON('summary', summary);
    set({ entries, trend, summary });
  },

  setSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    set({ settings });
    saveJSON('settings', settings);
  }
}));
