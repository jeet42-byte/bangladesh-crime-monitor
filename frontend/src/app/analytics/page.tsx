"use client";

import { useEffect, useState } from "react";
import { Clock4, MapPinned, ShieldCheck } from "lucide-react";

import CategoryChart from "@/components/analytics/CategoryChart";
import TrendChart from "@/components/analytics/TrendChart";
import FilterBar from "@/components/dashboard/FilterBar";
import MetricCards from "@/components/dashboard/MetricCards";
import {
  EMPTY_SUMMARY,
  fetchCategories,
  fetchHourly,
  fetchSourceMix,
  fetchSummary,
  fetchThanaRanking,
  fetchThanas,
  fetchTrends,
} from "@/lib/api";
import {
  DEFAULT_FILTERS,
  type CategoriesResponse,
  type CrimeAnalyticsSummary,
  type FilterState,
  type HourlyResponse,
  type SourceMixResponse,
  type Thana,
  type ThanaRankingResponse,
  type TrendsResponse,
} from "@/types/crime";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import RequireAuth from "@/components/auth/RequireAuth";

const TRUST_BAR: Record<string, string> = {
  police_report: "bg-trust-official",
  news_portal: "bg-trust-news",
  facebook_public: "bg-trust-social",
};

function AnalyticsPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [thanas, setThanas] = useState<Thana[]>([]);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<CrimeAnalyticsSummary>(EMPTY_SUMMARY);
  const [trends, setTrends] = useState<TrendsResponse>({
    points: [],
    window_days: 30,
    total: 0,
    daily_average: 0,
  });
  const [categories, setCategories] = useState<CategoriesResponse>({
    categories: [],
    window_days: 30,
    total: 0,
  });
  const [ranking, setRanking] = useState<ThanaRankingResponse>({
    thanas: [],
    window_days: 30,
  });
  const [sourceMix, setSourceMix] = useState<SourceMixResponse>({
    window_days: 30,
    total: 0,
    sources: [],
  });
  const [hourly, setHourly] = useState<HourlyResponse>({
    window_days: 30,
    hours: [],
  });

  useEffect(() => {
    void fetchThanas().then(setThanas);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const [
        summaryData,
        trendData,
        categoryData,
        rankingData,
        sourceData,
        hourlyData,
      ] = await Promise.all([
        fetchSummary(filters.days),
        fetchTrends(filters.days, filters.category, filters.thana),
        fetchCategories(filters.days, filters.thana),
        fetchThanaRanking(filters.days, 12),
        fetchSourceMix(filters.days),
        fetchHourly(filters.days),
      ]);

      if (cancelled) return;

      setSummary(summaryData);
      setTrends(trendData);
      setCategories(categoryData);
      setRanking(rankingData);
      setSourceMix(sourceData);
      setHourly(hourlyData);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const peakHourly = Math.max(1, ...hourly.hours.map((bucket) => bucket.count));
  const topThanaCount = ranking.thanas[0]?.count ?? 1;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Analytics
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          Aggregate views over the collected record set. Counts reflect
          incidents that were publicly reported and successfully parsed — they
          are not official crime statistics and will undercount unreported
          offences.
        </p>
      </header>

      <MetricCards summary={summary} loading={loading} />

      <FilterBar filters={filters} onChange={setFilters} thanas={thanas} />

      <TrendChart data={trends} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryChart data={categories} loading={loading} />

        {/* Thana leaderboard */}
        <section className="panel" aria-label="Thana ranking">
          <header className="panel-header">
            <div className="flex items-center gap-2">
              <MapPinned className="h-4 w-4 text-accent-soft" aria-hidden />
              <h2 className="text-sm font-semibold text-zinc-200">
                Incident Volume by Thana
              </h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              top {ranking.thanas.length}
            </span>
          </header>

          <div className="p-3">
            {ranking.thanas.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-500">
                No incidents in this window
              </p>
            ) : (
              <ol className="space-y-2">
                {ranking.thanas.map((entry, index) => (
                  <li key={entry.thana_name} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-right font-mono text-[10px] text-zinc-600">
                      {index + 1}
                    </span>
                    <span className="w-32 shrink-0 truncate text-xs text-zinc-300">
                      {entry.thana_name}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-overlay">
                      <span
                        className="block h-full rounded-full bg-accent/70"
                        style={{
                          width: `${(entry.count / topThanaCount) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-400">
                      {formatNumber(entry.count)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hour-of-day distribution */}
        <section className="panel" aria-label="Hourly distribution">
          <header className="panel-header">
            <div className="flex items-center gap-2">
              <Clock4 className="h-4 w-4 text-accent-soft" aria-hidden />
              <h2 className="text-sm font-semibold text-zinc-200">
                Time of Day
              </h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              hour of day · BST
            </span>
          </header>

          <div className="p-4">
            <div className="flex h-40 items-end gap-1">
              {hourly.hours.map((bucket) => (
                <div
                  key={bucket.hour}
                  className="group relative flex-1"
                  title={`${String(bucket.hour).padStart(2, "0")}:00 — ${bucket.count} incidents`}
                >
                  <div
                    className="w-full rounded-t bg-accent/50 transition-colors group-hover:bg-accent"
                    style={{
                      height: `${Math.max(2, (bucket.count / peakHourly) * 150)}px`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-zinc-600">
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>23</span>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
              Where a report gives no time of day, the pipeline records
              midnight BST. Expect the 00:00 bar to be inflated by that
              convention rather than by real incident volume.
            </p>
          </div>
        </section>

        {/* Source mix */}
        <section className="panel" aria-label="Source mix">
          <header className="panel-header">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent-soft" aria-hidden />
              <h2 className="text-sm font-semibold text-zinc-200">
                Source Composition
              </h2>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              {formatNumber(sourceMix.total)} records
            </span>
          </header>

          <div className="space-y-4 p-4">
            {sourceMix.sources.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                No records in this window
              </p>
            ) : (
              sourceMix.sources.map((entry) => (
                <div key={entry.source_platform}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{entry.label}</span>
                    <span className="font-mono text-zinc-500">
                      {formatNumber(entry.count)} ·{" "}
                      {formatPercent(entry.share_pct)} · conf{" "}
                      {entry.avg_confidence}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-overlay">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        TRUST_BAR[entry.source_platform] ?? "bg-zinc-600"
                      )}
                      style={{ width: `${entry.share_pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}


// Gated: guests and signed-out visitors get the account prompt instead. The
// Command Center stays open to everyone.
export default function Page() {
  return (
    <RequireAuth>
      <AnalyticsPage />
    </RequireAuth>
  );
}
