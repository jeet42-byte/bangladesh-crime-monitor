"use client";

import { useEffect, useRef } from "react";
import { Inbox, Loader2, RadioTower } from "lucide-react";

import IncidentCard from "@/components/dashboard/IncidentCard";
import type { CrimeIncident } from "@/types/crime";
import { cn, formatNumber } from "@/lib/utils";

interface IncidentFeedProps {
  incidents: CrimeIncident[];
  loading?: boolean;
  total?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

function FeedSkeleton() {
  return (
    <div className="space-y-2.5 p-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-surface-border/60 p-3.5"
        >
          <div className="flex gap-2">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-24" />
          </div>
          <div className="skeleton mt-3 h-4 w-4/5" />
          <div className="skeleton mt-2 h-3 w-full" />
          <div className="skeleton mt-1.5 h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function IncidentFeed({
  incidents,
  loading = false,
  total,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  selectedId,
  onSelect,
  className,
}: IncidentFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLElement>(null);

  // Clicking a map marker selects an incident; bring its card into view so the
  // two halves of the split screen stay in conversation.
  useEffect(() => {
    if (!selectedId || !selectedRef.current) return;
    selectedRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedId]);

  return (
    <section
      className={cn("panel flex min-h-0 flex-col", className)}
      aria-label="Incident feed"
    >
      <header className="panel-header">
        <div className="flex items-center gap-2">
          <RadioTower className="h-4 w-4 text-accent-soft" aria-hidden />
          <h2 className="text-sm font-semibold text-zinc-200">
            Intelligence Feed
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          {loading
            ? "Syncing…"
            : `${formatNumber(incidents.length)}${
                typeof total === "number" && total > incidents.length
                  ? ` of ${formatNumber(total)}`
                  : ""
              } records`}
        </span>
      </header>

      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading && incidents.length === 0 ? (
          <FeedSkeleton />
        ) : incidents.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <Inbox className="h-8 w-8 text-zinc-700" aria-hidden />
            <div>
              <p className="text-sm font-medium text-zinc-300">
                No incidents match these filters
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Try a wider date range, or clear the thana and category
                filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 p-3">
            {incidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                selected={incident.id === selectedId}
                onSelect={onSelect}
                ref={incident.id === selectedId ? selectedRef : undefined}
              />
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="btn w-full"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Loading…
                  </>
                ) : (
                  "Load more incidents"
                )}
              </button>
            )}

            {!hasMore && incidents.length > 0 && (
              <p className="py-3 text-center font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                End of feed
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
