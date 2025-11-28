import { Mood } from "@/lib/models";
import { cn } from "@/lib/utils";

const moods: { value: Mood; emoji: string; label: string; copy: string }[] = [
  { value: 1, emoji: "😔", label: "Heavy", copy: "Foggy, tense, or sad" },
  { value: 2, emoji: "😕", label: "Low", copy: "A bit drained" },
  { value: 3, emoji: "🙂", label: "Steady", copy: "Centered, neutral" },
  { value: 4, emoji: "😄", label: "Light", copy: "Energized and open" },
  { value: 5, emoji: "😌", label: "Expansive", copy: "Calm, grounded joy" }
];

interface MoodPickerProps {
  selectedMood: Mood | null;
  onSelectMood: (mood: Mood) => void;
}

export const MoodPicker = ({ selectedMood, onSelectMood }: MoodPickerProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {moods.map((mood) => (
        <button
          key={mood.value}
          onClick={() => onSelectMood(mood.value)}
          className={cn(
            "group relative flex flex-col items-start gap-2 rounded-2xl border px-4 py-3 text-left transition-all duration-300",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            selectedMood === mood.value
              ? "border-primary/60 bg-gradient-to-br from-primary/15 via-card to-accent/10 shadow-[var(--shadow-card-hover)]"
              : "border-border/70 bg-card hover:border-primary/30 hover:bg-muted/60"
          )}
          aria-label={mood.label}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-2xl sm:text-3xl transition-transform duration-300 group-hover:scale-110">
              {mood.emoji}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {mood.label}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{mood.copy}</span>
        </button>
      ))}
    </div>
  );
};
