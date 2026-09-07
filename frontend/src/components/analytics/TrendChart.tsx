"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

import type { TrendsResponse } from "@/types/crime";
import { formatChartDate, formatDateBST, formatNumber } from "@/lib/utils";

interface TrendChartProps {
  data: TrendsResponse;
  loading?: boolean;
  title?: string;
  height?: number;
}

interface TooltipPayloadEntry {
  value: number;
  payload: { date: string; count: number };
}

/**
 * Recharts types `content` as its own generic ContentType and injects the
 * props at render time, so the component is declared with loose props and
 * narrowed here rather than fighting the library's generics at the call site.
 */
function ChartTooltip(props: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2 shadow-xl">
      <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        {formatDateBST(`${point.date}T12:00:00Z`)}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">
        {formatNumber(point.count)} incident{point.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export default function TrendChart({
  data,
  loading = false,
  title = "Incident Volume Trend",
  height = 320,
}: TrendChartProps) {
  if (loading) {
    return (
      <div className="panel p-4">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-4 w-full" style={{ height }} />
      </div>
    );
  }

  return (
    <section className="panel" aria-label={title}>
      <header className="panel-header">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-soft" aria-hidden />
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          <span>{data.window_days}-day window</span>
          <span className="text-zinc-300">
            {formatNumber(data.total)} total
          </span>
          <span>avg {data.daily_average.toFixed(1)}/day</span>
        </div>
      </header>

      <div className="p-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.points}
            margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d48" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#27272a"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              // A 365-day window would otherwise stack labels into a smear.
              interval={Math.max(0, Math.floor(data.points.length / 8) - 1)}
              tick={{ fill: "#71717a", fontSize: 11 }}
              minTickGap={16}
            />

            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: "#71717a", fontSize: 11 }}
            />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "#52525b", strokeDasharray: "3 3" }}
            />

            <Area
              type="monotone"
              dataKey="count"
              stroke="#e11d48"
              strokeWidth={2}
              fill="url(#trendFill)"
              // Points-only rendering keeps a 365-day series readable; dots
              // reappear on hover through the active dot.
              dot={false}
              activeDot={{
                r: 4,
                fill: "#e11d48",
                stroke: "#09090b",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
