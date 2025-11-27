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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis domain={[1,5]} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="y_pred" name="Predicted" stroke="#a78bfa" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="y_true" name="Actual" stroke="#f472b6" dot={true} strokeWidth={1} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}