"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";

import type { CategoriesResponse, CrimeCategory } from "@/types/crime";
import { categoryColor, formatNumber, formatPercent } from "@/lib/utils";

interface CategoryChartProps {
  data: CategoriesResponse;
  loading?: boolean;
  title?: string;
  height?: number;
}

interface TooltipPayloadEntry {
  payload: { category: CrimeCategory; count: number; share_pct: number };
}

function ChartTooltip(props: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  const { active, payload } = props;
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2 shadow-xl">
      <p
        className="font-mono text-[10px] uppercase tracking-wider"
        style={{ color: categoryColor(entry.category) }}
      >
        {entry.category}
      </p>
      <p className="mt-1 text-sm font-semibold text-zinc-100">
        {formatNumber(entry.count)} incidents
      </p>
      <p className="text-xs text-zinc-500">
        {formatPercent(entry.share_pct)} of the window
      </p>
    </div>
  );
}

export default function CategoryChart({
  data,
  loading = false,
  title = "Category Distribution",
  height,
}: CategoryChartProps) {
  if (loading) {
    return (
      <div className="panel p-4">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-4 h-64 w-full" />
      </div>
    );
  }

  // Horizontal bars: each row needs a fixed slice of height or the labels
  // collide once more than a handful of categories are present.
  const chartHeight = height ?? Math.max(220, data.categories.length * 42 + 30);

  return (
    <section className="panel" aria-label={title}>
      <header className="panel-header">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent-soft" aria-hidden />
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          {data.window_days}-day window · {formatNumber(data.total)} total
        </span>
      </header>

      {data.categories.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-zinc-500">No incidents in this window</p>
        </div>
      ) : (
        <div className="p-3" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.categories}
              layout="vertical"
              margin={{ top: 4, right: 56, left: 8, bottom: 4 }}
              barCategoryGap="22%"
            >
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="category"
                width={92}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
              />

              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "rgba(63, 63, 70, 0.25)" }}
              />

              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={26}>
                {data.categories.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={categoryColor(entry.category)}
                  />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={8}
                  // Recharts types the label value as ReactNode, so accept it
                  // as unknown and coerce rather than declaring `number`.
                  formatter={(value: unknown) => formatNumber(Number(value))}
                  style={{ fill: "#d4d4d8", fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
