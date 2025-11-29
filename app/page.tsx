"use client";

import { useEffect, useMemo, useState } from "react";
import { Mood } from "@/lib/models";
import { useAppStore } from "@/lib/store";
import { MoodPicker } from "@/components/MoodPicker";
import { NoteInput } from "@/components/NoteInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const moodMeta: Record<Mood, { emoji: string; label: string }> = {
  1: { emoji: "😔", label: "Heavy" },
  2: { emoji: "😕", label: "Low" },
  3: { emoji: "🙂", label: "Steady" },
  4: { emoji: "😄", label: "Light" },
  5: { emoji: "😌", label: "Expansive" },
};

const prompts = [
  "Name the strongest feeling in one word.",
  "What would make today 10% lighter?",
  "Who or what gave you energy?",
  "What does your body need right now?",
];

export default function Home() {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { trend, summary, entries, init, addEntry } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    init();
    checkTodayEntry();
  }, [init]);

  const checkTodayEntry = async () => {
    try {
      const response = await fetch("/api/moods/today");
      if (response.ok) {
        const data = await response.json();
        if (data.hasEntry) {
          setTodayEntry(data.entry);
          setSelectedMood(data.entry.mood as Mood);
          setNote(data.entry.note || "");
        }
      }
    } catch (error) {
      console.error("Failed to check today's entry:", error);
    }
  };

  const averageMood = useMemo(() => {
    if (!trend?.length) return null;
    const total = trend.reduce((sum, point) => sum + (point.selfMood ?? 0), 0);
    return Number.isFinite(total / trend.length) ? total / trend.length : null;
  }, [trend]);

  const vibeChange = useMemo(() => {
    if (!trend?.length || trend.length < 2) return null;
    const first = trend[0].selfMood;
    const last = trend[trend.length - 1].selfMood;
    return last - first;
  }, [trend]);

  const lastEntry = entries?.[0];
  const lastMood = lastEntry?.mood ?? null;

  const handleSave = async () => {
    if (!selectedMood) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/moods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mood: selectedMood,
          note: note || undefined,
        }),
      });

      if (response.ok) {
        addEntry(selectedMood, note);
        
        const responseData = await response.json();
        setTodayEntry(responseData.mood);

        toast({
          title: todayEntry ? "Mood updated" : "Mood saved",
          description: todayEntry 
            ? "Your mood entry has been updated." 
            : "Your mood entry has been recorded.",
        });

        // Don't clear if editing, just update the state
        if (!todayEntry) {
          setSelectedMood(null);
          setNote("");
        }
        setIsEditing(false);
      } else {
        const data = await response.json();
        let errorMessage = data.error || "Please try again.";
        
        // Special handling for authentication errors
        if (response.status === 401) {
          errorMessage = "Please log in again to save your mood.";
        }
        
        toast({
          title: "Failed to save mood",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to save mood",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-4 pt-10 pb-24">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="relative overflow-hidden rounded-3xl border bg-card/80 shadow-[var(--shadow-card-hover)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-20%] top-[-20%] h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute right-[-10%] top-[-30%] h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          </div>
          <div className="relative grid gap-8 px-6 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:py-10">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Nervous system check-in
              </p>
              <h1 className="font-display text-4xl font-semibold leading-tight text-foreground md:text-5xl">
                Track the emotional weather, not just the storm.
              </h1>
              <p className="text-base text-muted-foreground md:w-4/5">
                A calmer day starts with a 30-second scan. Capture your mood, add a whisper of context, and let Mood Spark surface gentle patterns.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 shadow-sm">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent text-lg font-semibold text-primary-foreground flex items-center justify-center">
                    {averageMood ? averageMood.toFixed(1) : "—"}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Average</p>
                    <p className="font-medium text-foreground">Mood this week</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-muted/60 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-inner">
                    {vibeChange ? (vibeChange > 0 ? "↗" : "↘") : "⟳"}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Trajectory</p>
                    <p className="font-medium text-foreground">
                      {vibeChange === null
                        ? "Keep logging"
                        : vibeChange > 0
                          ? "Lifting energy"
                          : "Grounding down"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground text-lg">
                    {summary ? `${summary.daysCalmer}` : "—"}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Calm days</p>
                    <p className="font-medium text-foreground">out of 7</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl border bg-white/80 p-5 shadow-lg backdrop-blur dark:bg-card">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>Now playing</span>
                <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-foreground">Mindful minute</span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Last noted mood</p>
                  <p className="font-display text-5xl font-semibold text-foreground">
                    {lastMood ? moodMeta[lastMood].emoji : "—"}
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    {lastMood ? moodMeta[lastMood].label : "Waiting for a check-in"}
                  </p>
                </div>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-accent/30 to-primary/20 text-sm font-semibold text-primary shadow-inner">
                  {entries?.length ? `${entries.length} logs` : "Fresh start"}
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span>Set an intention, then capture it below.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="relative overflow-hidden border-none bg-transparent shadow-none">
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-card/90 to-card/95 blur-xl dark:from-card/70 dark:via-card/80 dark:to-card" />
          <div className="relative rounded-[28px] border bg-card p-1 shadow-[var(--shadow-card)]">
            <div className="rounded-[22px] bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6 md:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Daily pulse</p>
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    {todayEntry 
                      ? "You've already logged today. Edit your entry below."
                      : "Choose a mood, drop a note, and press save."}
                  </h2>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm backdrop-blur dark:bg-card">
                  <span className={`h-2 w-2 rounded-full ${todayEntry ? 'bg-green-500' : 'bg-primary'}`} />
                  {todayEntry ? 'Today logged' : 'Live sync'}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4 rounded-2xl border bg-card/60 p-4 shadow-inner backdrop-blur">
                  <MoodPicker
                    selectedMood={selectedMood}
                    onSelectMood={setSelectedMood}
                  />
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="rounded-xl bg-muted/60 px-3 py-2">
                      Energy shifts faster when you notice it early.
                    </div>
                    <div className="rounded-xl bg-muted/60 px-3 py-2">
                      Add a note to spot patterns your brain forgets.
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <NoteInput value={note} onChange={setNote} />
                  {todayEntry && (
                    <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-700 dark:text-green-400">
                      ✓ Today's mood already saved at {new Date(todayEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div className="grid gap-2 md:grid-cols-2">
                    {prompts.map((prompt) => (
                      <div
                        key={prompt}
                        className="rounded-xl border border-dashed border-muted bg-card/80 px-3 py-2 text-xs text-muted-foreground"
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="gradient"
                    size="lg"
                    className="w-full"
                    onClick={handleSave}
                    disabled={!selectedMood || isLoading}
                  >
                    {isLoading 
                      ? (todayEntry ? "Updating..." : "Saving...") 
                      : (todayEntry ? "Update today's mood" : "Save this mood")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary/15 via-card to-primary/5 p-4 shadow-[var(--shadow-card)]">
            <div className="absolute right-2 top-2 h-16 w-16 rounded-full bg-primary/20 blur-2xl" />
            <p className="text-sm font-semibold text-foreground">Micro-wins</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Check in daily to build a pattern of tiny, sustainable shifts.
            </p>
          </Card>
          <Card className="border-none bg-gradient-to-br from-accent/15 via-card to-accent/5 p-4 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold text-foreground">Private by default</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your entries stay on-device. You choose what leaves your phone.
            </p>
          </Card>
          <Card className="border-none bg-gradient-to-br from-secondary/60 via-card to-secondary/90 p-4 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold text-foreground">Signals over noise</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Weekly insights help you spot triggers and grounding habits faster.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
