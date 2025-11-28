"use client";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function FeatureImportanceChart() {
  const [items, setItems] = useState<{feature:string; importance:number}[]>([]);
  useEffect(() => {
    fetch("/api/reports/feature-importance").then(r=>r.json()).then(d=> setItems(d.items||[]));
  }, []);
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <BarChart data={items}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="feature" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={60} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          <Bar dataKey="importance" fill="hsl(186, 79%, 42%)" radius={[6,6,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
