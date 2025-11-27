"use client";
import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Scatter, ScatterChart } from "recharts";

export function SleepVsMoodChart({ days = 14 }: { days?: number }) {
  const [points, setPoints] = useState<{day:string; hours_slept:number; mood_label:number}[]>([]);
  useEffect(() => {
    fetch(`/api/reports/sleep-vs-mood?days=${days}`).then(r=>r.json()).then(d=> setPoints(d.points||[]));
  }, [days]);
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="hours_slept" name="Hours Slept" />
          <YAxis type="number" dataKey="mood_label" name="Mood" domain={[1,5]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={points} fill="#f472b6" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}