"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, RefreshCw, TrafficCone } from "lucide-react";

import { KIND_COLOR, KIND_LABEL, fetchActiveDisruptions, whenLabel, type Disruption, type DisruptionKind } from "@/lib/disruptions";
import { cn, relativeTime } from "@/lib/utils";

const DisruptionMap = dynamic(() => import("@/components/disruptions/DisruptionMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

const REFRESH_MS = 5 * 60_000;

export default function DisruptionsPage() {
  const [items, setItems] = useState<Disruption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [district, setDistrict] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const load = async () => {
    const data = await fetchActiveDisruptions();
    setFailed(data === null);
    if (data) setItems(data);
    setCheckedAt(new Date());
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const districts = useMemo(() => {
    const counts = new Map<string, number>();
    (items ?? []).forEach((d) => counts.set(d.district, (counts.get(d.district) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const visible = (items ?? []).filter((d) => district === null || d.district === district);
  const ongoing = visible.filter((d) => d.status === "ongoing");
  const planned = visible.filter((d) => d.status === "planned");

  const Row = ({ d }: { d: Disruption }) => (
    <li>
      <button
        type="button"
        onClick={() => setFocus(d.id)}
        className={cn(
          "w-full rounded-lg border p-3 text-left transition-colors",
          focus === d.id ? "border-accent/60 bg-surface-overlay" : "border-surface-border/60 hover:border-surface-border"
        )}
      >
        <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: KIND_COLOR[d.kind] }}>
          <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[d.kind] }} />
          {KIND_LABEL[d.kind as DisruptionKind]} · {d.place}, {d.district}
        </span>
        <span className="mt-1 block text-sm text-zinc-100">{d.title}</span>
        <span className="mt-1 block text-[11px] text-zinc-500">{whenLabel(d)}</span>
      </button>
      <span className="mt-1 flex flex-wrap gap-x-3 px-1 text-[11px] text-zinc-600">
        {d.sources.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-zinc-300">
            {s.outlet} <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ))}
      </span>
    </li>
  );

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-100">
            <TrafficCone className="h-5 w-5 text-accent-soft" aria-hidden />
            Live disruptions
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Road blockades, hartals, rallies, clashes and closed roads reported in the news over the last few hours,
            and announced ones coming up. Checked every 30 minutes. Reports can lag events and a blockade may already
            have cleared: treat this as a warning to check, not a guarantee.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="btn px-3 py-1 text-xs">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Refresh
          {checkedAt && <span className="text-zinc-500">· {relativeTime(checkedAt.toISOString())}</span>}
        </button>
      </header>

      {districts.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="District">
          <button type="button" onClick={() => setDistrict(null)} className={cn("btn px-2 py-0.5 text-[11px]", district === null && "btn-accent")}>
            All · {items?.length ?? 0}
          </button>
          {districts.map(([name, n]) => (
            <button key={name} type="button" onClick={() => setDistrict(name)} className={cn("btn px-2 py-0.5 text-[11px]", district === name && "btn-accent")}>
              {name} · {n}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="panel h-[55vh] overflow-hidden lg:h-[70vh]">
          <DisruptionMap items={visible} focus={focus} />
        </div>
        <section className="flex flex-col gap-4" aria-label="Disruption list">
          {items === null ? (
            <div className="skeleton h-40 w-full rounded" />
          ) : failed && items.length === 0 ? (
            <p className="panel p-6 text-center text-sm text-zinc-500">Could not reach the server. Try refresh in a minute.</p>
          ) : visible.length === 0 ? (
            <p className="panel p-6 text-center text-sm text-zinc-500">
              No disruptions reported right now{district ? ` in ${district}` : ""}. That is a good sign, but check local
              news before a long trip.
            </p>
          ) : (
            <>
              {ongoing.length > 0 && (
                <div>
                  <p className="label-mono mb-2">Now · {ongoing.length}</p>
                  <ul className="flex flex-col gap-2.5">{ongoing.map((d) => <Row key={d.id} d={d} />)}</ul>
                </div>
              )}
              {planned.length > 0 && (
                <div>
                  <p className="label-mono mb-2">Announced · {planned.length}</p>
                  <ul className="flex flex-col gap-2.5">{planned.map((d) => <Row key={d.id} d={d} />)}</ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
