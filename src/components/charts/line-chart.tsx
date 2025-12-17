"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface LineChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface LineChartProps {
  data: LineChartData[];
  dataKey: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  height?: number;
}

export function CustomLineChart({
  data,
  dataKey,
  color = "#10b981",
  showGrid = true,
  showLegend = false,
  height = 300,
}: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />}
        <XAxis 
          dataKey="name" 
          className="text-xs fill-slate-500 dark:fill-slate-400"
          tick={{ fill: "currentColor" }}
        />
        <YAxis 
          className="text-xs fill-slate-500 dark:fill-slate-400"
          tick={{ fill: "currentColor" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--foreground)",
          }}
          labelStyle={{ color: "var(--foreground)" }}
        />
        {showLegend && <Legend />}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

