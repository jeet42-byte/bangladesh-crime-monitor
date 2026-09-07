"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, RotateCcw, Search, X } from "lucide-react";

import {
  CRIME_CATEGORIES,
  DEFAULT_FILTERS,
  type CrimeCategory,
  type FilterState,
  type SourceFilter,
  type Thana,
} from "@/types/crime";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  thanas: Thana[];
  /** Result count shown next to the reset control. */
  resultCount?: number;
  showSearch?: boolean;
}

const DATE_RANGES = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "1Y" },
] as const;

const SOURCE_OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "All Sources" },
  { value: "official", label: "Official" },
  { value: "verified_news", label: "Verified News" },
  { value: "public_social", label: "Public Social" },
];

export default function FilterBar({
  filters,
  onChange,
  thanas,
  resultCount,
  showSearch = false,
}: FilterBarProps) {
  // Local mirror of the search box so typing stays responsive; the committed
  // value is debounced before it reaches the parent and triggers a fetch.
  const [searchDraft, setSearchDraft] = useState(filters.search);

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  useEffect(() => {
    if (searchDraft === filters.search) return;
    const timer = setTimeout(
      () => onChange({ ...filters, search: searchDraft }),
      350
    );
    return () => clearTimeout(timer);
    // `filters` is intentionally read fresh inside the timer via closure; the
    // effect only needs to re-arm when the draft text changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.thana) count += 1;
    if (filters.category) count += 1;
    if (filters.source !== "all") count += 1;
    if (filters.days !== DEFAULT_FILTERS.days) count += 1;
    if (filters.search.trim()) count += 1;
    return count;
  }, [filters]);

  const update = (patch: Partial<FilterState>) =>
    onChange({ ...filters, ...patch });

  return (
    <section className="panel p-3" aria-label="Filters">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-2 pr-1">
          <Filter className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          <span className="label-mono">Filters</span>
          {activeCount > 0 && (
            <span className="chip border-accent/40 bg-accent/10 text-accent-soft">
              {activeCount} active
            </span>
          )}
        </span>

        {/* Thana */}
        <label className="sr-only" htmlFor="filter-thana">
          Thana
        </label>
        <select
          id="filter-thana"
          value={filters.thana ?? ""}
          onChange={(event) =>
            update({ thana: event.target.value || null })
          }
          className="field w-auto min-w-[9.5rem] cursor-pointer py-1.5 text-xs"
        >
          <option value="">All Thanas</option>
          {thanas.map((thana) => (
            <option key={thana.thana_name} value={thana.thana_name}>
              {thana.thana_name}
            </option>
          ))}
        </select>

        {/* Category */}
        <label className="sr-only" htmlFor="filter-category">
          Crime category
        </label>
        <select
          id="filter-category"
          value={filters.category ?? ""}
          onChange={(event) =>
            update({
              category: (event.target.value || null) as CrimeCategory | null,
            })
          }
          className="field w-auto min-w-[9rem] cursor-pointer py-1.5 text-xs"
        >
          <option value="">All Categories</option>
          {CRIME_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        {/* Source */}
        <label className="sr-only" htmlFor="filter-source">
          Source platform
        </label>
        <select
          id="filter-source"
          value={filters.source}
          onChange={(event) =>
            update({ source: event.target.value as SourceFilter })
          }
          className="field w-auto min-w-[8.5rem] cursor-pointer py-1.5 text-xs"
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Date range */}
        <div
          className="flex overflow-hidden rounded-lg border border-surface-border"
          role="group"
          aria-label="Date range"
        >
          {DATE_RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => update({ days: range.days })}
              aria-pressed={filters.days === range.days}
              className={cn(
                "px-2.5 py-1.5 font-mono text-[11px] transition-colors",
                filters.days === range.days
                  ? "bg-accent/20 text-accent-soft"
                  : "bg-surface-overlay/60 text-zinc-400 hover:text-zinc-200"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative min-w-[12rem] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search titles and narratives…"
              className="field py-1.5 pl-8 pr-8 text-xs"
              aria-label="Search incidents"
            />
            {searchDraft && (
              <button
                type="button"
                onClick={() => setSearchDraft("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {typeof resultCount === "number" && (
            <span className="font-mono text-[11px] text-zinc-500">
              {resultCount.toLocaleString()} records
            </span>
          )}
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            disabled={activeCount === 0}
            className="btn px-2.5 py-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
