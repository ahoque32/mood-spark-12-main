sql
-- 1) Raw event log (event-level)
create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ts timestamptz not null default now(),
  event_type text not null check (event_type in ('app_usage','mood_log','notification','activity','location')),

  -- Common fields (nullable depending on event)
  app_name text,
  duration_sec int,
  location_category text,    -- e.g., home, work, commute
  action_after text,
  notification_sender_type text, -- work|personal
  message_sentiment numeric,
  mood_rating int,

  created_at timestamptz not null default now()
);
create index if not exists idx_system_events_user_ts on public.system_events(user_id, ts);

-- 2) Daily feature store (one row per user per day)
create table if not exists public.daily_features (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null,

  -- Aggregated behaviour features
  session_avg_sec int,
  idle_ratio numeric,
  app_switch_count int,
  work_notif_count int,
  personal_notif_count int,
  avg_notif_sentiment numeric,
  hours_slept numeric,
  steps int,
  hrv numeric,
  time_at_work_ratio numeric,
  location_switches int,
  commute_min int,

  -- Supervised learning label (same-day aggregate of user mood logs)
  mood_label int,

  created_at timestamptz not null default now(),
  unique(user_id, day)
);
create index if not exists idx_daily_features_user_day on public.daily_features(user_id, day);

-- 3) Model registry (stores linear/ridge regression coefficients as JSON)
create table if not exists public.model_registry (
  model_version text primary key,
  created_at timestamptz not null default now(),
  features jsonb not null,       -- ["session_avg_sec", ...]
  coefficients jsonb not null,   -- [c1, c2, ...]
  intercept numeric not null,
  lambda numeric not null,
  train_mae numeric,
  notes text
);

-- 4) Feature importance per model
create table if not exists public.model_feature_importance (
  id uuid primary key default gen_random_uuid(),
  model_version text references public.model_registry(model_version) on delete cascade,
  feature text not null,
  importance numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_model_feature_importance_version on public.model_feature_importance(model_version);

-- 5) Model predictions time series (for plotting y_true vs y_pred)
create table if not exists public.model_predictions (
  id uuid primary key default gen_random_uuid(),
  model_version text references public.model_registry(model_version) on delete cascade,
  user_id uuid not null,
  day date not null,
  y_true numeric,
  y_pred numeric not null,
  proba_at_risk numeric, -- optional if you make a classifier later
  created_at timestamptz not null default now(),
  unique(model_version, user_id, day)
);
create index if not exists idx_model_predictions_user_day on public.model_predictions(user_id, day);