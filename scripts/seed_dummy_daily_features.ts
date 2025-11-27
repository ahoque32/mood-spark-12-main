// scripts/seed_dummy_daily_features.ts
// Usage:
//   $env:SUPABASE_URL="https://<project>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service-role>"
//   $env:SEED_EMAIL="test@example.com"   # or set SEED_USER_ID directly
//   npx tsx scripts/seed_dummy_daily_features.ts

//import ".env";
import "dotenv/config"
import { supabase } from "../src/lib/db/client";

const DAYS = 30; // generate last 30 days (today inclusive)

const FEATURE_NAMES = [
  "session_avg_sec",
  "idle_ratio",
  "app_switch_count",
  "work_notif_count",
  "personal_notif_count",
  "avg_notif_sentiment",
  "hours_slept",
  "steps",
  "hrv",
  "time_at_work_ratio",
  "location_switches",
  "commute_min",
] as const;

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function rnd() { return Math.random(); }
// Box–Muller normal(0,1)
function rnorm(mu = 0, sigma = 1) {
  let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mu + sigma * z;
}
function daysAgoISO(d: number) {
  const dt = new Date();
  dt.setUTCHours(0,0,0,0);
  dt.setUTCDate(dt.getUTCDate() - d);
  return dt.toISOString().slice(0,10);
}

async function resolveUserId(): Promise<string> {
  const explicit = process.env.SEED_USER_ID;
  if (explicit) return explicit;
  const email = process.env.SEED_EMAIL;
  if (!email) throw new Error("Set SEED_USER_ID or SEED_EMAIL to choose the target user");
  for (const table of ["User", "users"]) {
    const { data } = await supabase.from(table).select("id").eq("email", email).limit(1).maybeSingle();
    if (data?.id) return data.id;
  }
  throw new Error(`User with email ${email} not found in 'User' or 'users' table`);
}

function synthRow(user_id: string, day: string) {
  const dt = new Date(day + "T00:00:00Z");
  const dow = dt.getUTCDay(); // 0 Sun .. 6 Sat
  const weekend = dow === 0 || dow === 6;

  // Behaviour priors
  const hours_slept = clamp(rnorm(7.2 + (weekend ? 0.4 : 0), 1.0), 4.0, 9.5);
  const steps = Math.round(clamp(rnorm(6500 + (weekend ? 1500 : -500), 1800), 1500, 14000));
  const hrv = clamp(rnorm(45 + (hours_slept - 7) * 3, 8), 20, 80);
  const work_notif_count = Math.max(0, Math.round(rnorm(weekend ? 2 : 18, weekend ? 2 : 7)));
  const personal_notif_count = Math.max(0, Math.round(rnorm(weekend ? 10 : 6, 3)));
  const avg_notif_sentiment = clamp(rnorm(0.1 - 0.02 * (work_notif_count / 10), 0.25), -1.0, 1.0);
  const session_avg_sec = Math.round(clamp(rnorm(1200, 400), 300, 3600));
  const idle_ratio = clamp(rnorm(0.22 + (weekend ? -0.05 : 0.02), 0.08), 0.02, 0.7);
  const app_switch_count = Math.max(0, Math.round(rnorm(weekend ? 30 : 55, 15)));
  const time_at_work_ratio = clamp(weekend ? rnorm(0.05, 0.03) : rnorm(0.38, 0.08), 0, 0.9);
  const location_switches = Math.max(0, Math.round(rnorm(weekend ? 5 : 8, 3)));
  const commute_min = Math.max(0, Math.round(rnorm(weekend ? 10 : 42, 15)));

  // Latent mood (1..5) influenced by sleep(+), hrv(+), work notifications(-), idle_ratio(-), steps(+)
  let mood = 3.0
    + 0.25 * (hours_slept - 7)
    + 0.02 * ((steps - 6500) / 1000)
    + 0.03 * (hrv - 45)
    - 0.03 * work_notif_count
    - 0.8 * (idle_ratio - 0.25)
    + rnorm(0, 0.4);
  const mood_label = Math.max(1, Math.min(5, Math.round(mood)));

  return {
    user_id,
    day,
    session_avg_sec,
    idle_ratio,
    app_switch_count,
    work_notif_count,
    personal_notif_count,
    avg_notif_sentiment: Number(avg_notif_sentiment.toFixed(3)),
    hours_slept: Number(hours_slept.toFixed(2)),
    steps,
    hrv: Number(hrv.toFixed(1)),
    time_at_work_ratio: Number(time_at_work_ratio.toFixed(3)),
    location_switches,
    commute_min,
    mood_label,
  };
}

async function main() {
  const user_id = await resolveUserId();
  const rows = [] as any[];
  for (let d = DAYS - 1; d >= 0; d--) {
    const day = daysAgoISO(d);
    rows.push(synthRow(user_id, day));
  }
  const { error } = await supabase.from("daily_features").upsert(rows as any, { onConflict: "user_id,day" });
  if (error) throw error;
  console.log(`Inserted/updated ${rows.length} daily_features rows for user ${user_id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
