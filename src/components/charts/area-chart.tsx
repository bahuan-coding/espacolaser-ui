"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface AreaChartData {
  name: string;
  [key: string]: string | number;
}

interface AreaChartProps {
  data: AreaChartData[];
  dataKey: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  height?: number;
}

export function CustomAreaChart({
  data,
  dataKey,
  color = "#10b981",
  showGrid = true,
  showLegend = false,
  height = 300,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
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
        {showLegend && (
          <Legend 
            wrapperStyle={{ color: "var(--foreground)" }}
            formatter={(value) => <span style={{ color: "var(--foreground)" }}>{value}</span>}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={`url(#gradient-${dataKey})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

