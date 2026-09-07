"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  RotateCcw,
  X,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { decideReview, fetchReviewQueue } from "@/lib/api";
import {
  categoryColor,
  cn,
  formatDateBST,
  hostnameOf,
  SEVERITY_BAR_CLASS,
  severityOf,
} from "@/lib/utils";
import type { ReviewItem, ReviewStatus } from "@/types/crime";

const TABS: Array<{ value: ReviewStatus | "all"; label: string }> = [
  { value: "unreviewed", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

/**
 * Owner-only staging area for backfilled history.
 *
 * Nothing here is public. Records reach the archive only when approved, so
 * this page is the one place in the portal where a click changes what other
 * people can see - which is why it is gated on role rather than merely on
 * being signed in, and why "reject" is as prominent as "approve".
 */
function ReviewPage() {
  const [tab, setTab] = useState<ReviewStatus | "all">("unreviewed");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState<Partial<Record<ReviewStatus, number>>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const data = await fetchReviewQueue(tab, 100, 0);
    if (data === null) {
      setFailed(true);
      setItems([]);
    } else {
      setItems(data.items);
      setCounts(data.counts);
    }
    setSelected(new Set());
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const allSelected = items.length > 0 && selected.size === items.length;

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const decide = async (ids: string[], status: ReviewStatus) => {
    if (ids.length === 0) return;
    setBusy(true);
    const ok = await decideReview(ids, status);
    setBusy(false);
    if (ok) await load();
    else setFailed(true);
  };

  const pending = counts.unreviewed ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="label-mono">Owner only · not public</p>
        <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-zinc-100">
          <ClipboardCheck className="h-6 w-6 text-accent-soft" aria-hidden />
          Backfill Review
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Historical records recovered from archived reporting. They are{" "}
          <strong className="text-zinc-200">not visible to anyone</strong> until
          approved here — they do not appear on the map, in the feed, in the
          archive, or in any analytics figure. Rejected records stay in the
          database and stay out of the site.
        </p>
      </header>

      {/* Counts */}
      <div className="panel mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 p-3.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          Backfill queue
        </span>
        {(["unreviewed", "approved", "rejected"] as ReviewStatus[]).map((key) => (
          <span key={key} className="flex items-baseline gap-1.5">
            <span className="font-mono text-lg font-semibold text-zinc-100">
              {counts[key] ?? 0}
            </span>
            <span className="text-xs text-zinc-500">
              {key === "unreviewed" ? "pending" : key}
            </span>
          </span>
        ))}
        {pending > 0 && (
          <span className="ml-auto text-xs text-amber-400">
            {pending} awaiting your decision
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setTab(entry.value)}
            aria-pressed={tab === entry.value}
            className={cn(
              "rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
              tab === entry.value
                ? "border-accent/50 bg-accent/15 text-accent-soft"
                : "border-surface-border bg-surface-overlay/60 text-zinc-400 hover:text-zinc-200"
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/* Bulk bar */}
      {items.length > 0 && (
        <div className="panel mb-4 flex flex-wrap items-center gap-3 p-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                setSelected(
                  allSelected ? new Set() : new Set(items.map((i) => i.id))
                )
              }
              className="h-3.5 w-3.5 accent-accent"
            />
            Select all {items.length}
          </label>

          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            {selected.size} selected
          </span>

          <div className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={selected.size === 0 || busy}
              onClick={() => decide([...selected], "approved")}
              className="btn border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            >
              <Check className="h-4 w-4" aria-hidden />
              Approve
            </button>
            <button
              type="button"
              disabled={selected.size === 0 || busy}
              onClick={() => decide([...selected], "rejected")}
              className="btn border-severity-critical/40 bg-severity-critical/10 text-severity-critical hover:bg-severity-critical/20"
            >
              <X className="h-4 w-4" aria-hidden />
              Reject
            </button>
          </div>
        </div>
      )}

      {failed && (
        <p className="panel mb-4 border-severity-critical/40 bg-severity-critical/5 p-4 text-sm text-zinc-300">
          The queue could not be loaded or the decision did not save. Nothing
          has been changed.
        </p>
      )}

      {/* Items */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="skeleton h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="panel p-8 text-center text-sm text-zinc-500">
          {tab === "unreviewed"
            ? "Nothing awaiting review."
            : `No ${tab} records.`}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const color = categoryColor(item.crime_category);
            const isSelected = selected.has(item.id);

            return (
              <li
                key={item.id}
                className={cn(
                  "flex overflow-hidden rounded-xl border bg-surface-raised/60 transition-colors",
                  isSelected
                    ? "border-accent/60"
                    : "border-surface-border/60"
                )}
              >
                <span
                  className={cn(
                    "w-1 shrink-0",
                    SEVERITY_BAR_CLASS[severityOf(item.crime_category)]
                  )}
                  aria-hidden
                />

                <div className="min-w-0 flex-1 p-3.5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(item.id)}
                      className="h-3.5 w-3.5 accent-accent"
                      aria-label={`Select ${item.title}`}
                    />

                    <span
                      className="chip"
                      style={{
                        color,
                        borderColor: `${color}66`,
                        backgroundColor: `${color}1a`,
                      }}
                    >
                      {item.crime_category}
                    </span>

                    {!item.is_criminal_offence && (
                      <span className="chip border-zinc-500/40 bg-zinc-500/10 text-zinc-400">
                        Not a crime
                      </span>
                    )}

                    {item.review_status !== "unreviewed" && (
                      <span
                        className={cn(
                          "chip",
                          item.review_status === "approved"
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : "border-severity-critical/40 bg-severity-critical/10 text-severity-critical"
                        )}
                      >
                        {item.review_status}
                        {item.reviewed_by ? ` · ${item.reviewed_by}` : ""}
                      </span>
                    )}

                    <span
                      className="ml-auto flex items-center gap-1 font-mono text-[10px] text-zinc-500"
                      title={`Recovered ${item.ingest_lag_days} days after the incident`}
                    >
                      <Clock className="h-3 w-3" aria-hidden />
                      {formatDateBST(item.incident_date)}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold leading-snug text-zinc-100">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    {item.narrative}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-surface-border/50 pt-2 font-mono text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {item.thana_name}, {item.district}
                    </span>
                    <span>confidence {item.source_confidence}</span>
                    <span title="Days between the incident and its recovery">
                      lag {item.ingest_lag_days}d
                    </span>
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ml-auto inline-flex items-center gap-1 text-accent-soft hover:text-accent"
                    >
                      {item.source_handle || hostnameOf(item.source_url)}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </div>

                  {/* Per-record actions, so a reviewer never has to select
                      first for the common case of judging one record. */}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {item.review_status !== "approved" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide([item.id], "approved")}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        <Check className="h-3 w-3" aria-hidden />
                        Approve
                      </button>
                    )}
                    {item.review_status !== "rejected" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide([item.id], "rejected")}
                        className="inline-flex items-center gap-1.5 rounded-md border border-severity-critical/40 bg-severity-critical/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-severity-critical hover:bg-severity-critical/20 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" aria-hidden />
                        Reject
                      </button>
                    )}
                    {item.review_status !== "unreviewed" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide([item.id], "unreviewed")}
                        className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface-overlay/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" aria-hidden />
                        Undo
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {busy && (
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Saving…
        </p>
      )}
    </div>
  );
}

export default function Page() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="skeleton h-52 w-full rounded-xl" />
      </div>
    );
  }

  // Role gate, not just a signed-in gate: this page publishes and unpublishes.
  if (status !== "authenticated" || user?.role !== "owner") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="label-mono mb-2">Owner only</p>
        <h1 className="text-lg font-semibold text-zinc-100">
          Backfill Review
        </h1>
        <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-zinc-400">
          This queue decides what reaches the public archive, so it is
          restricted to the account that maintains the site.
        </p>
      </div>
    );
  }

  return <ReviewPage />;
}
