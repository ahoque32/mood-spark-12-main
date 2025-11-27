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
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="feature" tick={{ fontSize: 12 }} angle={-20} textAnchor="end" height={60} />
          <YAxis />
          <Tooltip />
          <Bar dataKey="importance" fill="#a78bfa" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}