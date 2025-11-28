"use client";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

type Row = { day: string; y_true: number|null; y_pred: number };

export function MoodPredictionsChart({ days = 14 }: { days?: number }) {
  const [series, setSeries] = useState<Row[]>([]);
  useEffect(() => {
    fetch(`/api/reports/mood-predictions?days=${days}`).then(r=>r.json()).then(d=> setSeries(d.series||[]));
  }, [days]);
  const data = series.map(r => ({ ...r, day: r.day }));
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis domain={[1,5]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          <Legend />
          <Line type="monotone" dataKey="y_pred" name="Predicted" stroke="hsl(186, 79%, 42%)" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="y_true" name="Actual" stroke="hsl(21, 92%, 63%)" dot={true} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
