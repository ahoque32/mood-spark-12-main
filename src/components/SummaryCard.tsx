import { WeeklySummary } from "@/lib/models";
import { Card } from "./ui/card";

interface SummaryCardProps {
  summary: WeeklySummary;
}

export const SummaryCard = ({ summary }: SummaryCardProps) => {
  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-none shadow-sm">
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-primary">{summary.daysCalmer}</span>
          <span className="text-muted-foreground">of 7 days</span>
        </div>
        <p className="text-foreground leading-relaxed">{summary.narrative}</p>
      </div>
    </Card>
  );
};
