"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface BarChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartData[];
  dataKey: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  height?: number;
}

export function CustomBarChart({
  data,
  dataKey,
  color = "#10b981",
  showGrid = true,
  showLegend = false,
  height = 300,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
        <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

