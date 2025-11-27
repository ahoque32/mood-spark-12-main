// scripts/train_model.ts
// Run with: npx tsx scripts/train_model.ts
// Env needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or load via .env)
import "dotenv/config";
import { supabase } from "../src/lib/db/client";

// ---- Configuration ---------------------------------------------------------

// Columns in your daily_features table used as inputs
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

type FeatureName = typeof FEATURE_NAMES[number];

// One row from daily_features (subset needed for training)
type TrainRow = {
  user_id: string;
  day: string; // YYYY-MM-DD
  mood_label: number | null;
} & Record<FeatureName, number | null>;

// How many days of predictions to save for the UI plot
const PREDICTION_WINDOW_DAYS = 14;

// Ridge penalty (lambda)
const RIDGE_LAMBDA = 1.0;

// ---- Helpers ---------------------------------------------------------------

function nowVersion(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `v${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

/**
 * Simple ridge regression:
 * beta = (X^T X + λI)^-1 X^T y
 * intercept = mean(y - X beta)
 * NOTE: This is a tiny linear algebra routine for small p; fine for a handful of features.
 */
function ridgeFit(X: number[][], y: number[], lambda = 1.0) {
  if (!X.length) throw new Error("Empty design matrix");
  const n = X.length;
  const p = X[0].length;

  // X^T
  const XT = Array.from({ length: p }, (_, i) => X.map((row) => row[i]));

  // X^T X
  const XTX = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => {
      let s = 0;
      for (let k = 0; k < n; k++) s += XT[i][k] * XT[j][k];
      return s;
    })
  );

  // + λI
  for (let i = 0; i < p; i++) XTX[i][i] += lambda;

  // X^T y
  const XTy = Array.from({ length: p }, (_, i) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += XT[i][k] * y[k];
    return s;
  });

  // Solve A * beta = b via Gaussian elimination (A = XTX, b = XTy)
  const A = XTX.map((r) => r.slice());
  const b = XTy.slice();

  for (let i = 0; i < p; i++) {
    // pivot
    let max = i;
    for (let r = i + 1; r < p; r++) if (Math.abs(A[r][i]) > Math.abs(A[max][i])) max = r;
    [A[i], A[max]] = [A[max], A[i]];
    [b[i], b[max]] = [b[max], b[i]];

    const piv = A[i][i] || 1e-12;
    for (let j = i; j < p; j++) A[i][j] /= piv;
    b[i] /= piv;

    for (let r = 0; r < p; r++) {
      if (r === i) continue;
      const f = A[r][i];
      for (let j = i; j < p; j++) A[r][j] -= f * A[i][j];
      b[r] -= f * b[i];
    }
  }

  const beta = b; // solution
  const predsNoIntercept = X.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  const residuals = predsNoIntercept.map((p, i) => y[i] - p);
  const intercept = residuals.reduce((s, v) => s + v, 0) / residuals.length;

  return { beta, intercept };
}

// ---- Main ------------------------------------------------------------------

async function main() {
  // 1) Load labeled training rows
  const SELECT_FIELDS = `user_id, day, ${FEATURE_NAMES.join(", ")}, mood_label`;

  const { data, error } = await supabase
    .from("daily_features")
    .select(SELECT_FIELDS)
    .not("mood_label", "is", null);

  if (error) throw error;

  const rows = (data ?? []) as unknown as TrainRow[];
  if (rows.length === 0) throw new Error("No labeled daily_features rows found.");

  // Ensure all features are present (non-null) so our tiny linear algebra is happy
  const cleanRows = rows.filter((r) => FEATURE_NAMES.every((f) => r[f] !== null && r[f] !== undefined));
  if (cleanRows.length < 2) throw new Error("Not enough complete rows to train.");

  const X = cleanRows.map((r) => FEATURE_NAMES.map((f) => Number(r[f] ?? 0)));
  const y = cleanRows.map((r) => Number(r.mood_label ?? 0));

  // 2) Fit model
  const { beta, intercept } = ridgeFit(X, y, RIDGE_LAMBDA);

  // MAE on training (for quick sanity)
  const yhat = X.map((row) => intercept + row.reduce((s, v, j) => s + v * beta[j], 0));
  const mae = yhat.reduce((s, p, i) => s + Math.abs(p - y[i]), 0) / yhat.length;

  // 3) Persist model registry entry
  const model_version = nowVersion();
  const { error: e1 } = await supabase.from("model_registry").insert({
    model_version,
    features: FEATURE_NAMES,
    coefficients: beta,
    intercept,
    lambda: RIDGE_LAMBDA,
    train_mae: mae,
    notes: "Ridge regression demo model",
  } as any);
  if (e1) throw e1;

  // 4) Save normalized abs(coef) as feature importance
  const abs = beta.map(Math.abs);
  const norm = abs.reduce((s, v) => s + v, 0) || 1;
  const importances = FEATURE_NAMES.map((f, i) => ({
    model_version,
    feature: f,
    importance: abs[i] / norm,
  }));

  const { error: e2 } = await supabase.from("model_feature_importance").insert(importances as any);
  if (e2) throw e2;

  // 5) Upsert predictions for last N days to power the UI chart
  const since = new Date(Date.now() - PREDICTION_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
  const { data: lastN, error: e3 } = await supabase
    .from("daily_features")
    .select(SELECT_FIELDS)
    .gte("day", since);

  if (e3) throw e3;

  const predRows = ((lastN ?? []) as unknown as TrainRow[]).map((r) => {
    const xx = FEATURE_NAMES.map((f) => Number(r[f] ?? 0));
    const pred = intercept + xx.reduce((s, v, j) => s + v * beta[j], 0);
    return {
      model_version,
      user_id: r.user_id,
      day: r.day,
      y_true: r.mood_label ?? null,
      y_pred: Number(pred.toFixed(2)),
      proba_at_risk: null, // placeholder if/when you add a classifier
    };
  });

  if (predRows.length) {
    const { error: e4 } = await supabase
      .from("model_predictions")
      .upsert(predRows as any, { onConflict: "model_version,user_id,day" });
    if (e4) throw e4;
  }

  console.log(
    JSON.stringify(
      { model_version, train_rows: cleanRows.length, train_mae: Number(mae.toFixed(3)) },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
