import { Mic } from "lucide-react";
import { Textarea } from "./ui/textarea";

interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const NoteInput = ({ value, onChange }: NoteInputProps) => {
  return (
    <div className="relative space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span>Optional context</span>
        <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-foreground">
          140 characters is plenty
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add a quick note…"
        className="min-h-[110px] resize-none pr-12 bg-card/80 backdrop-blur"
      />
      <button
        className="absolute bottom-3 right-3 p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Voice input (decorative)"
        type="button"
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );
};
