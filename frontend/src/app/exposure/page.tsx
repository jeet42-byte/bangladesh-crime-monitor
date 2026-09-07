"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Crosshair,
  ExternalLink,
  MapPin,
  Ruler,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import RequireAuth from "@/components/auth/RequireAuth";
import CoverageBanner from "@/components/assets/CoverageBanner";
import { fetchExposure, fetchSites } from "@/lib/api";
import {
  categoryColor,
  cn,
  formatDateBST,
  hostnameOf,
  relativeTime,
  SEVERITY_BAR_CLASS,
  severityOf,
} from "@/lib/utils";
import {
  ARCHIVE_SUPPORT_CLASS,
  ARCHIVE_SUPPORT_LABEL,
  threatClassColor,
} from "@/lib/ttp";
import type {
  CommercialSite,
  ExposureResponse,
  SitesResponse,
} from "@/types/crime";

const RADII = [2, 5, 10, 25] as const;
const WINDOWS = [30, 90, 180, 365] as const;

function ExposurePage() {
  const [gazetteer, setGazetteer] = useState<SitesResponse | null>(null);
  const [siteId, setSiteId] = useState<string>("");
  const [radius, setRadius] = useState<number>(5);
  const [days, setDays] = useState<number>(90);
  const [result, setResult] = useState<ExposureResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void fetchSites().then((data) => {
      setGazetteer(data);
      if (data.sites.length > 0) setSiteId(data.sites[0].id);
    });
  }, []);

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    void fetchExposure(siteId, radius, days).then((data) => {
      if (cancelled) return;
      // A failed request must not render as an empty result — "nothing near
      // your site" is the one message this page must never fabricate.
      if (data === null) setFailed(true);
      setResult(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [siteId, radius, days]);

  /** Sites grouped by type for the picker. */
  const grouped = useMemo(() => {
    if (!gazetteer) return [];
    const groups = new Map<string, CommercialSite[]>();
    for (const site of gazetteer.sites) {
      const list = groups.get(site.site_type) ?? [];
      list.push(site);
      groups.set(site.site_type, list);
    }
    return [...groups.entries()];
  }, [gazetteer]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="label-mono">ESRM · asset exposure</p>
        <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-zinc-100">
          <Building2 className="h-6 w-6 text-accent-soft" aria-hidden />
          Site Exposure
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          The archive inverted: instead of asking what happened, ask what is
          reported near a given commercial asset, which threat patterns apply
          to that class of site, and — the part that decides whether any of it
          is usable — how much collection actually stands behind the answer.
        </p>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Controls                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="panel mb-5 flex flex-wrap items-end gap-x-5 gap-y-3 p-3.5">
        <label className="min-w-[15rem] flex-1">
          <span className="label-mono mb-1.5 block">Site</span>
          <select
            value={siteId}
            onChange={(event) => setSiteId(event.target.value)}
            className="field"
          >
            {grouped.map(([type, sites]) => (
              <optgroup
                key={type}
                label={gazetteer?.site_type_labels[type] ?? type}
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} — {site.district}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div>
          <span className="label-mono mb-1.5 block">Radius</span>
          <div className="flex gap-1.5">
            {RADII.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRadius(value)}
                aria-pressed={radius === value}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  radius === value
                    ? "border-accent/50 bg-accent/15 text-accent-soft"
                    : "border-surface-border bg-surface-overlay/60 text-zinc-400 hover:text-zinc-200"
                )}
              >
                {value}km
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label-mono mb-1.5 block">Window</span>
          <div className="flex gap-1.5">
            {WINDOWS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                aria-pressed={days === value}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  days === value
                    ? "border-accent/50 bg-accent/15 text-accent-soft"
                    : "border-surface-border bg-surface-overlay/60 text-zinc-400 hover:text-zinc-200"
                )}
              >
                {value}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {failed && (
        <p className="panel border-severity-critical/40 bg-severity-critical/5 p-4 text-sm text-zinc-300">
          The exposure query could not be completed. Nothing is shown rather
          than an empty result, because a blank result here would read as
          &ldquo;nothing near this site&rdquo; — which is not what happened.
        </p>
      )}

      {loading && !result && (
        <div className="space-y-4">
          <div className="skeleton h-28 w-full rounded-xl" />
          <div className="skeleton h-44 w-full rounded-xl" />
        </div>
      )}

      {result && !failed && (
        <div className="space-y-5">
          {/* Coverage first, deliberately, and loudest when it is bad. */}
          <CoverageBanner
            coverage={result.coverage}
            windowDays={result.window_days}
          />

          {/* -------------------------------------------------------------- */}
          {/* Headline                                                        */}
          {/* -------------------------------------------------------------- */}
          <section className="panel p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-3xl font-semibold text-zinc-100">
                {result.incident_count}
              </span>
              <span className="text-sm text-zinc-400">
                reported incident{result.incident_count === 1 ? "" : "s"} within{" "}
                {result.radius_km}&thinsp;km of {result.site.name} over{" "}
                {result.window_days} days
              </span>
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                {result.site.district}, {result.site.division}
              </span>
              <span>{result.site.site_type_label}</span>
              {result.site.extent_km > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Ruler className="h-3 w-3" aria-hidden />
                  site extent ≈ {result.site.extent_km}km
                </span>
              )}
            </p>

            {Object.keys(result.by_category).length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(result.by_category).map(([category, count]) => {
                  const color = categoryColor(category as never);
                  return (
                    <li
                      key={category}
                      className="chip"
                      style={{
                        color,
                        borderColor: `${color}66`,
                        backgroundColor: `${color}1a`,
                      }}
                    >
                      {category} {count}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Precision caveats                                               */}
          {/* -------------------------------------------------------------- */}
          <section className="rounded-xl border border-surface-border/70 bg-surface-raised/40 p-4">
            <p className="label-mono mb-2 flex items-center gap-1.5">
              <Crosshair className="h-3 w-3" aria-hidden />
              What the distances mean
            </p>
            <p className="text-xs leading-relaxed text-zinc-400">
              {result.geocoding_note}
            </p>

            {result.resolution_warning && (
              <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs leading-relaxed text-amber-300/90">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {result.resolution_warning}
              </p>
            )}

            {result.radius_warning && (
              <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs leading-relaxed text-amber-300/90">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {result.radius_warning}
              </p>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Nearby incidents                                                */}
          {/* -------------------------------------------------------------- */}
          {result.incidents.length > 0 && (
            <section>
              <p className="label-mono mb-2.5">
                Reported nearby · nearest first
              </p>
              <ul className="space-y-2">
                {result.incidents.map((incident) => (
                  <li
                    key={incident.id}
                    className="flex overflow-hidden rounded-lg border border-surface-border/60 bg-surface-raised/60"
                  >
                    <span
                      className={cn(
                        "w-1 shrink-0",
                        SEVERITY_BAR_CLASS[severityOf(incident.crime_category)]
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-accent-soft">
                          {incident.distance_km}&thinsp;km
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                          {incident.crime_category}
                        </span>
                        {incident.district_level_only && (
                          <span
                            className="chip border-amber-500/40 bg-amber-500/10 text-amber-400"
                            title="Never resolved below district level — the true location is unknown"
                          >
                            district centroid
                          </span>
                        )}
                        <span className="ml-auto font-mono text-[10px] text-zinc-500">
                          {relativeTime(incident.incident_date)}
                        </span>
                      </div>

                      <p className="text-sm leading-snug text-zinc-200">
                        {incident.title}
                      </p>

                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 font-mono text-[10px] text-zinc-500">
                        <span>
                          {incident.thana_name}, {incident.district}
                        </span>
                        <span>{formatDateBST(incident.incident_date)}</span>
                        <a
                          href={incident.source_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="ml-auto inline-flex items-center gap-1 text-accent-soft hover:text-accent"
                        >
                          {incident.source_handle ||
                            hostnameOf(incident.source_url)}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Applicable threat patterns                                      */}
          {/* -------------------------------------------------------------- */}
          <section>
            <p className="label-mono mb-2.5">
              Threat patterns for this class of asset
            </p>

            {result.applicable_threats.length === 0 ? (
              <p className="panel p-4 text-sm text-zinc-500">
                No catalogued pattern is materially relevant to this site type.
              </p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {result.applicable_threats.map((threat) => {
                  const color = threatClassColor(threat.threat_class);
                  return (
                    <article
                      key={threat.id}
                      className="panel flex flex-col p-3.5"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className="chip"
                          style={{
                            color,
                            borderColor: `${color}66`,
                            backgroundColor: `${color}1a`,
                          }}
                        >
                          {threat.threat_class}
                        </span>
                        <span
                          className={cn(
                            "chip",
                            ARCHIVE_SUPPORT_CLASS[threat.archive_support]
                          )}
                        >
                          {ARCHIVE_SUPPORT_LABEL[threat.archive_support]}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-zinc-100">
                        {threat.name}
                      </h3>
                      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-zinc-400">
                        {threat.summary.slice(0, 260)}
                        {threat.summary.length > 260 && "…"}
                      </p>

                      {/* Annex A mapping: what makes this reusable inside an
                          ISMS gap assessment rather than needing translation. */}
                      {threat.iso27001_controls.length > 0 && (
                        <div className="mt-3 border-t border-surface-border/60 pt-2.5">
                          <p className="label-mono mb-1.5 flex items-center gap-1.5">
                            <ShieldCheck className="h-3 w-3" aria-hidden />
                            ISO/IEC 27001:2022 Annex A
                          </p>
                          <ul className="flex flex-wrap gap-1.5">
                            {threat.iso27001_controls.map((control) => (
                              <li
                                key={control.control}
                                className="chip border-surface-border bg-surface-overlay/60 text-zinc-400"
                                title={control.title}
                              >
                                {control.control}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Link
                        href="/ttp"
                        className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-accent-soft hover:text-accent"
                      >
                        Stages &amp; treatments
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {gazetteer?.precision_note && (
            <p className="border-t border-surface-border/60 pt-3 text-[11px] leading-relaxed text-zinc-600">
              {gazetteer.precision_note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <ExposurePage />
    </RequireAuth>
  );
}
