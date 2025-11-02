import { Mood } from "@/lib/models";
import { cn } from "@/lib/utils";

const moods: { value: Mood; emoji: string; label: string }[] = [
  { value: 1, emoji: "😔", label: "Very Sad" },
  { value: 2, emoji: "😕", label: "Sad" },
  { value: 3, emoji: "🙂", label: "Okay" },
  { value: 4, emoji: "😄", label: "Happy" },
  { value: 5, emoji: "😌", label: "Very Happy" }
];

interface MoodPickerProps {
  selectedMood: Mood | null;
  onSelectMood: (mood: Mood) => void;
}

export const MoodPicker = ({ selectedMood, onSelectMood }: MoodPickerProps) => {
  return (
    <div className="flex justify-between gap-2">
      {moods.map((mood) => (
        <button
          key={mood.value}
          onClick={() => onSelectMood(mood.value)}
          className={cn(
            "flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300",
            "hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            selectedMood === mood.value
              ? "bg-primary/10 ring-2 ring-primary scale-105"
              : "bg-card hover:bg-muted"
          )}
          aria-label={mood.label}
        >
          <span className="text-4xl">{mood.emoji}</span>
          <span className="text-xs text-muted-foreground">{mood.label}</span>
        </button>
      ))}
    </div>
  );
};
