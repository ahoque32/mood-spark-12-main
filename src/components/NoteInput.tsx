import { Mic } from "lucide-react";
import { Textarea } from "./ui/textarea";

interface NoteInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const NoteInput = ({ value, onChange }: NoteInputProps) => {
  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add a quick note…"
        className="min-h-[100px] resize-none pr-12 bg-card"
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
