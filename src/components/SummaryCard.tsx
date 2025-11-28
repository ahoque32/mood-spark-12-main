import { WeeklySummary } from "@/lib/models";
import { Card } from "./ui/card";

interface SummaryCardProps {
  summary: WeeklySummary;
}

export const SummaryCard = ({ summary }: SummaryCardProps) => {
  return (
    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-primary/12 via-card to-accent/12 p-6 shadow-[var(--shadow-card)]">
      <div className="absolute right-6 top-4 h-20 w-20 rounded-full bg-primary/20 blur-2xl" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">{summary.daysCalmer}</span>
            <span className="text-muted-foreground">of 7 days felt calmer</span>
          </div>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm backdrop-blur dark:bg-card">
            Weekly story
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{summary.narrative}</p>
      </div>
    </Card>
  );
};
