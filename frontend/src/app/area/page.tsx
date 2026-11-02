"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, LifeBuoy, LocateFixed, MapPin, Minus } from "lucide-react";

import AlertToggle from "@/components/area/AlertToggle";
import IncidentCard from "@/components/dashboard/IncidentCard";
import {
  PLACE_KIND_LABEL,
  defaultRadius,
  fetchAreaSummary,
  fetchPlaces,
  loadSavedArea,
  placeLabel,
  saveArea,
  type AreaSummary,
  type Place,
  type SavedArea,
} from "@/lib/area";
import { GUIDES, guideFor } from "@/lib/guides";
import { cn, formatNumber } from "@/lib/utils";

const WINDOWS = [
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "1Y" },
] as const;
const RADII = [1, 3, 5, 10, 25] as const;
const MAX_SUGGESTIONS = 8;

function Change({ now, before }: { now: number; before: number }) {
  if (before === 0 && now === 0) return null;
  const delta = now - before;
  const Icon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  return (
    <span className={cn("flex items-center gap-1 text-xs", delta > 0 ? "text-rose-300" : delta < 0 ? "text-emerald-300" : "text-zinc-500")}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {delta > 0 ? "+" : ""}
      {delta} vs previous period
    </span>
  );
}

export default function AreaPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<SavedArea | null>(null);
  const [days, setDays] = useState<number>(90);
  const [summary, setSummary] = useState<AreaSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPlaces().then(setPlaces);
    const saved = loadSavedArea();
    if (saved) setArea(saved);
  }, []);

  useEffect(() => {
    if (!area) return;
    let cancelled = false;
    setLoading(true);
    void fetchAreaSummary(area, days).then((result) => {
      if (cancelled) return;
      setSummary(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [area, days]);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    const starts = places.filter((p) => p.name.toLowerCase().startsWith(needle));
    const contains = places.filter((p) => !p.name.toLowerCase().startsWith(needle) && p.name.toLowerCase().includes(needle));
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [places, query]);

  const choose = (next: SavedArea) => {
    setArea(next);
    saveArea(next);
    setQuery("");
  };

  const choosePlace = (place: Place) =>
    choose({ label: placeLabel(place), lat: place.lat, lon: place.lon, radiusKm: defaultRadius(place.kind) });

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocateError("This browser cannot share its location. Search for your area instead.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        if (latitude < 20.5 || latitude > 26.7 || longitude < 88 || longitude > 92.7) {
          setLocateError("Your location appears to be outside Bangladesh. Search for an area instead.");
          return;
        }
        choose({ label: "Your location", lat: latitude, lon: longitude, radiusKm: defaultRadius("here") });
      },
      () => {
        setLocating(false);
        setLocateError("Location permission was not given. Search for your area instead.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
    );
  };

  const setRadius = (radiusKm: number) => area && choose({ ...area, radiusKm });

  const top = summary?.categories.filter((c) => c.count > 0) ?? [];
  const peak = Math.max(1, ...top.map((c) => c.count));
  const adviceIds = Array.from(new Set(top.slice(0, 3).map((c) => guideFor(c.category))));
  const precise = summary ? summary.total - summary.district_level : 0;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-100">
          <MapPin className="h-5 w-5 text-accent-soft" aria-hidden />
          My Area
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">
          What has been reported near you: pick your thana, upazila or district, or share your location. Your choice
          is remembered on this device only and is never sent anywhere except to look up the area.
        </p>
      </header>

      <section className="panel flex flex-col gap-3 p-4" aria-label="Choose an area">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a thana, upazila or district (e.g. Mirpur, Savar, Teknaf)"
              className="field"
              aria-label="Search for an area"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-surface-border bg-surface-raised shadow-xl">
                {suggestions.map((place) => (
                  <li key={`${place.kind}:${place.name}:${place.district}`}>
                    <button
                      type="button"
                      onClick={() => choosePlace(place)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-surface-overlay"
                    >
                      <span>{placeLabel(place)}</span>
                      <span className="shrink-0 text-[11px] text-zinc-500">{PLACE_KIND_LABEL[place.kind]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" onClick={useMyLocation} disabled={locating} className="btn btn-accent shrink-0">
            <LocateFixed className="h-4 w-4" aria-hidden />
            {locating ? "Locating…" : "Use my location"}
          </button>
        </div>
        {locateError && <p className="text-xs text-amber-300">{locateError}</p>}

        {area && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-300">
              <span className="text-zinc-500">Showing:</span> {area.label}
            </span>
            <span className="ml-2 text-zinc-500">within</span>
            {RADII.map((radius) => (
              <button
                key={radius}
                type="button"
                onClick={() => setRadius(radius)}
                className={cn("btn px-2 py-0.5 text-[11px]", area.radiusKm === radius && "btn-accent")}
              >
                {radius} km
              </button>
            ))}
            <span className="ml-auto flex gap-1">
              {WINDOWS.map((window) => (
                <button
                  key={window.days}
                  type="button"
                  onClick={() => setDays(window.days)}
                  className={cn("btn px-2 py-0.5 text-[11px]", days === window.days && "btn-accent")}
                >
                  {window.label}
                </button>
              ))}
            </span>
          </div>
        )}
      </section>

      {!area ? (
        <div className="panel p-10 text-center text-sm text-zinc-500">
          Choose an area above to see what has been reported there.
        </div>
      ) : loading || !summary ? (
        <div className="skeleton h-64 w-full rounded" />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3" aria-label="Summary">
            <div className="panel p-4">
              <p className="label-mono text-zinc-500">Reported incidents</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-100">{formatNumber(summary.total)}</p>
              <Change now={summary.total} before={summary.previous_total} />
            </div>
            <div className="panel p-4">
              <p className="label-mono text-zinc-500">Most reported</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-100">{top[0]?.category ?? "—"}</p>
              {top[0] && <p className="text-xs text-zinc-500">{top[0].count} report{top[0].count === 1 ? "" : "s"}</p>}
            </div>
            <div className="panel p-4">
              <p className="label-mono text-zinc-500">Location precision</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-100">
                {summary.total ? `${Math.round((precise / summary.total) * 100)}%` : "—"}
              </p>
              <p className="text-xs text-zinc-500">
                placed at thana or upazila level; the rest only at district level
              </p>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section className="panel" aria-label="Incidents">
              <header className="panel-header">
                <span className="label-mono">Latest reports nearby</span>
              </header>
              <div className="flex flex-col gap-2.5 p-3">
                {summary.recent.length === 0 ? (
                  <p className="py-10 text-center text-sm text-zinc-500">
                    Nothing reported within {area.radiusKm} km in this period. Try a wider radius or a longer window.
                  </p>
                ) : (
                  summary.recent.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
                )}
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <section className="panel p-4" aria-label="By type">
                <p className="label-mono mb-3">By type</p>
                {top.length === 0 ? (
                  <p className="text-xs text-zinc-500">No reports in this period.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {top.map((row) => (
                      <div key={row.category} className="grid grid-cols-[minmax(0,8rem)_1fr_2rem] items-center gap-2 text-xs">
                        <span className="truncate text-zinc-300">{row.category}</span>
                        <span className="h-2 rounded bg-surface-overlay">
                          <span className="block h-2 rounded bg-accent/70" style={{ width: `${(row.count / peak) * 100}%` }} />
                        </span>
                        <span className="text-right tabular-nums text-zinc-400" title={`${row.previous} in the previous period`}>
                          {row.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <AlertToggle area={area} />

              <section className="panel p-4" aria-label="What to do">
                <p className="label-mono mb-2 flex items-center gap-1.5">
                  <LifeBuoy className="h-3.5 w-3.5" aria-hidden /> If it happens to you
                </p>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {(adviceIds.length ? adviceIds : ["emergency", "fir"]).map((id) => {
                    const guide = GUIDES.find((g) => g.id === id);
                    return guide ? (
                      <li key={id}>
                        <Link href={`/help#${id}`} className="text-accent-soft hover:text-accent">
                          {guide.title.en} →
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
                <p className="mt-3 text-xs text-zinc-500">
                  Emergency: call <a href="tel:999" className="font-mono text-zinc-300">999</a>. All guides are on the{" "}
                  <Link href="/help" className="text-accent-soft hover:text-accent">
                    Get help
                  </Link>{" "}
                  page, in English and বাংলা.
                </p>
              </section>

              <p className="text-[11px] leading-relaxed text-zinc-600">
                Counts are reports in the news and official channels, not police statistics: an area that is covered
                more by the press will show more. Records placed only at district level appear for any point near
                the district centre.
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
