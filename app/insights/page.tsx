"use client";

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { SummaryCard } from "@/components/SummaryCard";
import { SentimentChart } from "@/components/SentimentChart";
import { Card } from "@/components/ui/card";
import { FileText, MessageSquare, Sparkles } from "lucide-react";
import { FeatureImportanceChart } from "src/components/reports/FeatureImportanceChart";
import { SleepVsMoodChart } from "src/components/reports/SleepVsMoodChart";
import { MoodPredictionsChart } from "src/components/reports/MoodPredictionsChart";
export default function Insights() {
  const { trend, summary, init } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  const averageMood = useMemo(() => {
    if (!trend?.length) return null;
    const total = trend.reduce((sum, point) => sum + (point.selfMood ?? 0), 0);
    return Number.isFinite(total / trend.length) ? total / trend.length : null;
  }, [trend]);

  const highestDay = useMemo(() => {
    if (!trend?.length) return null;
    return trend.reduce((best, point) => (point.selfMood > best.selfMood ? point : best), trend[0]);
  }, [trend]);

  const lowestDay = useMemo(() => {
    if (!trend?.length) return null;
    return trend.reduce((worst, point) => (point.selfMood < worst.selfMood ? point : worst), trend[0]);
  }, [trend]);

  return (
    <div className="min-h-screen px-4 pb-24 pt-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="relative overflow-hidden rounded-3xl border bg-card/80 shadow-[var(--shadow-card-hover)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-10%] top-[-20%] h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute right-[-16%] top-[-10%] h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
          </div>
          <div className="relative flex flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-10">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Weekly signals</p>
              <h1 className="font-display text-4xl font-semibold leading-tight text-foreground">
                Emotion insights and patterns
              </h1>
              <p className="text-muted-foreground">
                Your nervous system leaves breadcrumbs. Follow the small swings to understand what steadies you.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 md:w-auto md:grid-cols-3">
              <Card className="border-none bg-gradient-to-br from-primary/15 via-card to-primary/10 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Average mood</p>
                <p className="text-2xl font-semibold text-foreground">{averageMood ? averageMood.toFixed(1) : "—"} / 5</p>
              </Card>
              <Card className="border-none bg-gradient-to-br from-accent/15 via-card to-accent/10 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Best day</p>
                <p className="text-2xl font-semibold text-foreground">{highestDay?.day ?? "—"}</p>
              </Card>
              <Card className="border-none bg-gradient-to-br from-secondary/70 via-card to-secondary/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Needs care</p>
                <p className="text-2xl font-semibold text-foreground">{lowestDay?.day ?? "—"}</p>
              </Card>
            </div>
          </div>
        </div>

        {summary && <SummaryCard summary={summary} />}

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-6 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dual tracking</p>
                <h2 className="text-lg font-semibold text-foreground">Weekly trends</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-2 w-2 rounded-full bg-primary" /> <span>Self</span>
                <span className="ml-3 flex h-2 w-2 rounded-full bg-accent" /> <span>Analyzed</span>
              </div>
            </div>
            <SentimentChart data={trend} />
          </Card>

          <Card className="flex flex-col justify-center gap-3 overflow-hidden border-dashed border-primary/30 bg-card/70 p-6 text-center shadow-inner">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-foreground">Mood journal</p>
            <p className="text-sm text-muted-foreground">
              A richer mood log with body cues and intentions is coming soon. Keep logging to train your streaks.
            </p>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-4 w-4" />
              <MessageSquare className="h-4 w-4" />
            </div>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold mb-4">Feature Importance</h2>
            <FeatureImportanceChart />
          </Card>

          <Card className="p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold mb-4">Sleep vs Mood</h2>
            <SleepVsMoodChart days={14} />
          </Card>

          <Card className="p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold mb-4">Mood Predictions</h2>
            <MoodPredictionsChart days={14} />
          </Card>
        </div>
      </div>
    </div>
  );
}
