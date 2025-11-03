"use client";

import { useState } from "react";
import { Mood } from "@/lib/models";
import { useAppStore } from "@/lib/store";
import { MoodPicker } from "@/components/MoodPicker";
import { NoteInput } from "@/components/NoteInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const addEntry = useAppStore((state) => state.addEntry);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!selectedMood) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/moods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mood: selectedMood,
          note: note || undefined,
        }),
      });

      if (response.ok) {
        // Also add to local store for immediate UI update
        addEntry(selectedMood, note);

        toast({
          title: "Mood saved",
          description: "Your mood entry has been recorded.",
        });

        setSelectedMood(null);
        setNote("");
      } else {
        const data = await response.json();
        toast({
          title: "Failed to save mood",
          description: data.error || "Please try again.",
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
    <div className="px-4 pt-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            How are you feeling today?
          </h1>
          <p className="text-muted-foreground">
            Tap an emoji to share your mood
          </p>
        </div>

        <Card className="p-6 space-y-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
          <MoodPicker
            selectedMood={selectedMood}
            onSelectMood={setSelectedMood}
          />

          <NoteInput value={note} onChange={setNote} />

          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={!selectedMood || isLoading}
          >
            {isLoading ? "Saving..." : "Save Mood"}
          </Button>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Your mood entries help track emotion patterns over time.
        </p>
      </div>
    </div>
  );
}
