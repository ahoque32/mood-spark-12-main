"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { SummaryCard } from "@/components/SummaryCard";
import { SentimentChart } from "@/components/SentimentChart";
import { Card } from "@/components/ui/card";
import { FileText, MessageSquare } from "lucide-react";
import { FeatureImportanceChart } from "src/components/reports/FeatureImportanceChart";
import { SleepVsMoodChart } from "src/components/reports/SleepVsMoodChart";
import { MoodPredictionsChart } from "src/components/reports/MoodPredictionsChart";
export default function Insights() {
  const { trend, summary, init } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen pb-20 px-4 pt-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Emotion Insights
          </h1>
          <p className="text-muted-foreground">
            Your emotional patterns this week
          </p>
        </div>

        {summary && <SummaryCard summary={summary} />}

        <Card className="p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold mb-4">Weekly Trends</h2>
          <SentimentChart data={trend} />
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex flex-col items-center justify-center gap-2 text-center cursor-not-allowed opacity-60">
            <FileText className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Mood Log</span>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </Card>

          <Card className="p-4 flex flex-col items-center justify-center gap-2 text-center cursor-not-allowed opacity-60">
            <MessageSquare className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium">Message Sentiment</span>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </Card>

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
