"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";

import FilterBar from "@/components/dashboard/FilterBar";
import { fetchFeed, fetchThanas } from "@/lib/api";
import {
  DEFAULT_FILTERS,
  type CrimeIncident,
  type FilterState,
  type Thana,
} from "@/types/crime";
import {
  categoryColor,
  cn,
  downloadCsv,
  formatDateTimeBST,
  formatNumber,
  hostnameOf,
  incidentsToCsv,
  truncate,
  TRUST_CLASS,
  TRUST_DOT,
  TRUST_LABEL,
  trustTier,
} from "@/lib/utils";
import RequireAuth from "@/components/auth/RequireAuth";

const PAGE_SIZE = 100;
/** Hard ceiling on a single CSV export, to keep the browser responsive. */
const EXPORT_MAX = 2000;

type SortKey = "incident_date" | "crime_category" | "thana_name";
type SortDirection = "asc" | "desc";

function DatabasePage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [thanas, setThanas] = useState<Thana[]>([]);

  const [rows, setRows] = useState<CrimeIncident[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("incident_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    void fetchThanas().then(setThanas);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const data = await fetchFeed(filters, PAGE_SIZE, 0);
      if (cancelled) return;
      setRows(data.items);
      setTotal(data.total);
      setHasMore(data.has_more);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const data = await fetchFeed(filters, PAGE_SIZE, rows.length);
    setRows((current) => [...current, ...data.items]);
    setHasMore(data.has_more);
    setLoadingMore(false);
  }, [filters, hasMore, loadingMore, rows.length]);

  /**
   * Sorting is client-side and applies only to rows already fetched. The
   * column header says as much, because sorting a partial page by category
   * and reading it as a ranking would be wrong.
   */
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = a[sortKey] ?? "";
      const right = b[sortKey] ?? "";
      const comparison = String(left).localeCompare(String(right));
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return copy;
  }, [rows, sortKey, sortDirection]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  /**
   * Export pulls the full filtered result set rather than what is on screen,
   * so a user who exports after one page still gets the whole query.
   */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const collected: CrimeIncident[] = [];
      let offset = 0;

      while (collected.length < Math.min(total, EXPORT_MAX)) {
        const page = await fetchFeed(filters, 200, offset);
        if (page.items.length === 0) break;
        collected.push(...page.items);
        offset += page.items.length;
        if (!page.has_more) break;
      }

      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(
        `bd-crime-monitor-${stamp}.csv`,
        incidentsToCsv(collected.slice(0, EXPORT_MAX))
      );
    } finally {
      setExporting(false);
    }
  }, [filters, total]);

  const SortHeader = ({
    label,
    columnKey,
    className,
  }: {
    label: string;
    columnKey: SortKey;
    className?: string;
  }) => (
    <th scope="col" className={cn("px-3 py-2.5 text-left", className)}>
      <button
        type="button"
        onClick={() => toggleSort(columnKey)}
        className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
      >
        {label}
        {sortKey === columnKey &&
          (sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden />
          ))}
      </button>
    </th>
  );

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Record Archive
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Every stored record, searchable and exportable. Each row links back
            to the source it was derived from.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="btn btn-accent"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          Export CSV
          {total > EXPORT_MAX && (
            <span className="font-mono text-[10px] opacity-70">
              (first {formatNumber(EXPORT_MAX)})
            </span>
          )}
        </button>
      </header>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        thanas={thanas}
        resultCount={total}
        showSearch
      />

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[62rem] border-collapse text-sm">
            <thead className="border-b border-surface-border/70 bg-surface-overlay/40">
              <tr>
                <SortHeader
                  label="Date (BST)"
                  columnKey="incident_date"
                  className="w-44"
                />
                <SortHeader
                  label="Category"
                  columnKey="crime_category"
                  className="w-32"
                />
                <SortHeader
                  label="Thana"
                  columnKey="thana_name"
                  className="w-40"
                />
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500"
                >
                  Incident
                </th>
                <th
                  scope="col"
                  className="w-36 px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-zinc-500"
                >
                  Source
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-b border-surface-border/40">
                    {Array.from({ length: 5 }).map((__, cell) => (
                      <td key={cell} className="px-3 py-3">
                        <div className="skeleton h-3 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-16 text-center text-sm text-zinc-500"
                  >
                    No records match these filters.
                  </td>
                </tr>
              ) : (
                sorted.map((row) => {
                  const tier = trustTier(row.source_platform);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-surface-border/40 align-top transition-colors hover:bg-surface-overlay/30"
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-zinc-400">
                        {formatDateTimeBST(row.incident_date)}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className="chip"
                          style={{
                            color: categoryColor(row.crime_category),
                            borderColor: `${categoryColor(row.crime_category)}66`,
                            backgroundColor: `${categoryColor(row.crime_category)}1a`,
                          }}
                        >
                          {row.crime_category}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-xs text-zinc-300">
                        {row.thana_name}
                        <span className="block font-mono text-[10px] text-zinc-600">
                          {row.district}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <p className="text-xs font-medium text-zinc-200">
                          {row.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                          {truncate(row.narrative, 180)}
                        </p>
                        {row.penal_code_tags.length > 0 && (
                          <p className="mt-1.5 font-mono text-[10px] text-zinc-600">
                            {row.penal_code_tags.join(" · ")}
                          </p>
                        )}
                        {row.fir_or_gd && (
                          <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                            FIR/GD {row.fir_or_gd}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <span className={cn("chip", TRUST_CLASS[tier])}>
                          <span aria-hidden>{TRUST_DOT[tier]}</span>
                          {TRUST_LABEL[tier]}
                        </span>
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] text-accent-soft hover:text-accent"
                        >
                          {hostnameOf(row.source_url)}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-border/70 px-3 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            showing {formatNumber(sorted.length)} of {formatNumber(total)}{" "}
            records · sorting applies to loaded rows
          </p>
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="btn px-3 py-1.5 text-xs"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Loading…
                </>
              ) : (
                `Load ${PAGE_SIZE} more`
              )}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}


// Gated: guests and signed-out visitors get the account prompt instead. The
// Command Center stays open to everyone.
export default function Page() {
  return (
    <RequireAuth>
      <DatabasePage />
    </RequireAuth>
  );
}
