// src/lib/services/feature-store.ts
import { supabase } from '@/lib/db/client';

export type DailyFeature = {
  user_id: string;
  day: string; // YYYY-MM-DD
  session_avg_sec: number | null;
  idle_ratio: number | null;
  app_switch_count: number | null;
  work_notif_count: number | null;
  personal_notif_count: number | null;
  avg_notif_sentiment: number | null;
  hours_slept: number | null;
  steps: number | null;
  hrv: number | null;
  time_at_work_ratio: number | null;
  location_switches: number | null;
  commute_min: number | null;
  mood_label: number | null;
};

function startOfDayISO(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return x.toISOString();
}
function endOfDayISO(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
  return x.toISOString();
}

export async function aggregateUserDay(userId: string, day: string): Promise<DailyFeature> {
  const dayDate = new Date(day + "T00:00:00Z");
  const from = startOfDayISO(dayDate);
  const to = endOfDayISO(dayDate);

  // Fetch all events for the user/day
  const { data: events, error } = await supabase
    .from("system_events")
    .select("*")
    .eq("user_id", userId)
    .gte("ts", from)
    .lte("ts", to);
  if (error) throw error;

  // Helper filters
  const appEvents = events.filter(e => e.event_type === "app_usage");
  const notifEvents = events.filter(e => e.event_type === "notification");
  const locationEvents = events.filter(e => e.event_type === "location");
  const activityEvents = events.filter(e => e.event_type === "activity");
  const moodLogs = events.filter(e => e.event_type === "mood_log");

  // session_avg_sec: average duration across app usage sessions
  const session_avg_sec = appEvents.length
    ? Math.round(appEvents.map(e => e.duration_sec || 0).reduce((a,b)=>a+b,0) / appEvents.length)
    : null;

  // idle_ratio: ratio of idle time to total session time (derive from activity events if available)
  // Here we approximate: activity event with action_after === 'idle' stores duration_sec of idle period
  const idleDur = activityEvents.filter(e => e.action_after === 'idle').reduce((s,e)=>s+(e.duration_sec||0),0);
  const totalDur = appEvents.reduce((s,e)=>s+(e.duration_sec||0),0) + idleDur;
  const idle_ratio = totalDur > 0 ? idleDur / totalDur : null;

  // app_switch_count: count of action_after === 'Switched app' in app events
  const app_switch_count = appEvents.filter(e => (e.action_after||'').toLowerCase().includes('switch')).length || null;

  // Notifications
  const work_notif_count = notifEvents.filter(e => e.notification_sender_type === 'work').length || null;
  const personal_notif_count = notifEvents.filter(e => e.notification_sender_type === 'personal').length || null;
  const avg_notif_sentiment = notifEvents.length
    ? (notifEvents.reduce((s,e)=> s + (Number(e.message_sentiment)||0), 0) / notifEvents.length)
    : null;

  // Location derived
  const time_at_work_ratio = (() => {
    const total = locationEvents.reduce((s,e)=> s + (e.duration_sec||0), 0);
    if (!total) return null;
    const atWork = locationEvents.filter(e=> (e.location_category||'') === 'work').reduce((s,e)=> s+(e.duration_sec||0), 0);
    return atWork/total;
  })();
  const location_switches = Math.max(0, locationEvents.length - 1) || null;
  const commute_min = Math.round(locationEvents.filter(e=> e.location_category==='commute').reduce((s,e)=> s+(e.duration_sec||0), 0)/60) || null;

  // Sleep/steps/hrv often come from activity events enriched by the agent
  const hours_slept = activityEvents.find(e => e.action_after === 'sleep_summary')?.duration_sec ?
    Number((activityEvents.find(e => e.action_after === 'sleep_summary')!.duration_sec/3600).toFixed(2)) : null;
  const steps = activityEvents.find(e => e.action_after === 'steps')?.duration_sec || null; // store steps in duration_sec for demo
  const hrv = activityEvents.find(e => e.action_after === 'hrv')?.message_sentiment || null; // reuse numeric field for demo

  // Label: average of mood logs that day
  const mood_label = moodLogs.length
    ? Math.round(moodLogs.reduce((s,e)=> s + (e.mood_rating||0), 0) / moodLogs.length)
    : null;

  return {
    user_id: userId,
    day,
    session_avg_sec,
    idle_ratio,
    app_switch_count,
    work_notif_count,
    personal_notif_count,
    avg_notif_sentiment,
    hours_slept,
    steps,
    hrv,
    time_at_work_ratio,
    location_switches,
    commute_min,
    mood_label,
  };
}

export async function upsertDailyFeature(row: DailyFeature) {
  const { error } = await supabase
    .from("daily_features")
    .upsert(row, { onConflict: "user_id,day" });
  if (error) throw error;
}

export async function aggregateAllUsersForDay(day: string) {
  // Naive approach: collect distinct user_ids from events that day
  const dayDate = new Date(day + "T00:00:00Z");
  const from = startOfDayISO(dayDate), to = endOfDayISO(dayDate);
  const { data: users, error } = await supabase
    .from("system_events")
    .select("user_id")
    .gte("ts", from)
    .lte("ts", to);
  if (error) throw error;
  const unique = Array.from(new Set(users.map(u => u.user_id)));
  for (const uid of unique) {
    const row = await aggregateUserDay(uid, day);
    await upsertDailyFeature(row);
  }
}