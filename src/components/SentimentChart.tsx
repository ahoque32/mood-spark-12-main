import { TrendPoint } from "@/lib/models";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface SentimentChartProps {
  data: TrendPoint[];
}

export const SentimentChart = ({ data }: SentimentChartProps) => {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="day" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            domain={[1, 5]} 
            ticks={[1, 2, 3, 4, 5]}
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="analyzedSentiment"
            stroke="hsl(21, 92%, 63%)"
            strokeWidth={2}
            dot={{ fill: 'hsl(21, 92%, 63%)', r: 4 }}
            name="Message Sentiment (Analyzed)"
          />
          <Line
            type="monotone"
            dataKey="selfMood"
            stroke="hsl(186, 79%, 42%)"
            strokeWidth={2}
            dot={{ fill: 'transparent', stroke: 'hsl(186, 79%, 42%)', strokeWidth: 2, r: 4 }}
            name="Mood Log (Self-Reported)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
