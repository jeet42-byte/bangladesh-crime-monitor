"use client";

import {
  Activity,
  BadgeCheck,
  MapPin,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { CrimeAnalyticsSummary } from "@/types/crime";
import {
  categoryColor,
  cn,
  formatDelta,
  formatNumber,
  formatPercent,
  relativeTime,
} from "@/lib/utils";

interface MetricCardsProps {
  summary: CrimeAnalyticsSummary;
  loading?: boolean;
}

interface CardProps {
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  accentColor?: string;
  trend?: { value: number; label: string };
  loading?: boolean;
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  accentColor,
  trend,
  loading,
}: CardProps) {
  if (loading) {
    return (
      <div className="panel p-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-4 h-8 w-20" />
        <div className="skeleton mt-3 h-3 w-32" />
      </div>
    );
  }

  // A rise in reported incidents is bad news, so "up" is red here, not green.
  const rising = trend ? trend.value > 0 : false;
  const flat = trend ? Math.abs(trend.value) < 0.05 : true;

  return (
    <div className="panel group relative overflow-hidden p-4 transition-colors hover:border-surface-border">
      {accentColor && (
        <span
          className="absolute inset-x-0 top-0 h-px opacity-70"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          }}
          aria-hidden
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <p className="label-mono">{label}</p>
        <Icon
          className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400"
          aria-hidden
        />
      </div>

      <p
        className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="text-xs text-zinc-500">{caption}</p>

        {trend && !flat && (
          <span
            className={cn(
              "chip",
              rising
                ? "border-severity-critical/40 bg-severity-critical/10 text-severity-critical"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
            )}
          >
            {rising ? (
              <TrendingUp className="h-3 w-3" aria-hidden />
            ) : (
              <TrendingDown className="h-3 w-3" aria-hidden />
            )}
            {formatDelta(trend.value)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MetricCards({ summary, loading }: MetricCardsProps) {
  const windowLabel = `${summary.window_days}-day window`;

  return (
    <section
      aria-label="Key metrics"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <MetricCard
        loading={loading}
        label={`${summary.window_days}-Day Incident Volume`}
        value={formatNumber(summary.total_30d)}
        caption={`${formatNumber(summary.total_7d)} in the last 7 days`}
        icon={Activity}
        trend={{ value: summary.change_7d_pct, label: "week over week" }}
      />

      <MetricCard
        loading={loading}
        label="Highest-Volume Thana"
        value={summary.highest_risk_thana ?? "—"}
        caption={
          summary.highest_risk_thana
            ? `${formatNumber(summary.highest_risk_thana_count)} incidents · ${windowLabel}`
            : "No incidents recorded yet"
        }
        icon={MapPin}
        accentColor="#f97316"
      />

      <MetricCard
        loading={loading}
        label="Dominant Category"
        value={summary.top_category ?? "—"}
        caption={
          summary.top_category
            ? `${formatNumber(summary.top_category_count)} incidents · ${windowLabel}`
            : "No incidents recorded yet"
        }
        icon={ShieldAlert}
        accentColor={
          summary.top_category ? categoryColor(summary.top_category) : undefined
        }
      />

      <MetricCard
        loading={loading}
        label="Verified Source Ratio"
        value={formatPercent(summary.verified_source_ratio)}
        caption={
          summary.last_ingest_at
            ? `${formatNumber(summary.verified_source_count)} verified · updated ${relativeTime(summary.last_ingest_at)}`
            : `${formatNumber(summary.verified_source_count)} from news or official sources`
        }
        icon={BadgeCheck}
        accentColor="#22c55e"
      />
    </section>
  );
}
