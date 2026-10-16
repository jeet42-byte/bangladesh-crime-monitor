"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ShieldAlert, Smartphone, Users } from "lucide-react";

import IncidentCard from "@/components/dashboard/IncidentCard";
import { fetchFeed } from "@/lib/api";
import {
  CYBER_TYPE_HELP,
  CYBER_TYPE_LABEL,
  cyberTypeOf,
  isOfficialAdvisory,
  isOnline,
  platformOf,
  tally,
  type CyberType,
} from "@/lib/cyber";
import { cn, formatNumber } from "@/lib/utils";
import { DEFAULT_FILTERS, type CrimeIncident } from "@/types/crime";

const WINDOWS = [
  { days: 30, label: "30D" },
  { days: 90, label: "90D" },
  { days: 365, label: "1Y" },
] as const;

const RESEARCH_PLAN_URL =
  "https://github.com/jeet42-byte/bangladesh-crime-monitor/blob/claude/kind-carson-l4m0vg/research/cybercrime-paper/PLAN.md";

// Harms that land on a person rather than an organisation; the share is the
// headline number because it is what Bangladeshi reporting most often says
// goes unrecorded.
const PERSONAL_HARMS: ReadonlySet<CyberType> = new Set([
  "mfs_fraud",
  "sextortion_image_abuse",
  "harassment_stalking",
  "account_hacking",
]);

function Bars({
  rows,
  loading,
  help,
}: {
  rows: Array<{ label: string; count: number; title?: string }>;
  loading: boolean;
  help?: string;
}) {
  if (loading) return <div className="skeleton h-48 w-full rounded" />;
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-zinc-500">No records in this window.</p>;
  const peak = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.label} title={row.title} className="grid grid-cols-[minmax(0,11rem)_1fr_2.5rem] items-center gap-2 text-xs">
          <span className="truncate text-zinc-300">{row.label}</span>
          <span className="h-2 rounded bg-surface-overlay">
            <span
              className="block h-2 rounded bg-cyan-500/80"
              style={{ width: `${(row.count / peak) * 100}%` }}
            />
          </span>
          <span className="text-right tabular-nums text-zinc-400">{row.count}</span>
        </div>
      ))}
      {help && <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">{help}</p>}
    </div>
  );
}

export default function CyberPage() {
  const [days, setDays] = useState<number>(90);
  const [records, setRecords] = useState<CrimeIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<CyberType | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const base = { ...DEFAULT_FILTERS, days };
      const [cyber, fraud] = await Promise.all([
        fetchFeed({ ...base, category: "Cybercrime" }, 200),
        fetchFeed({ ...base, category: "Fraud" }, 200),
      ]);
      if (cancelled) return;
      // Fraud is kept only where the reporting names an online channel - an
      // offline land-deed forgery is not a cyber incident.
      const merged = [...cyber.items, ...fraud.items.filter(isOnline)];
      merged.sort((a, b) => b.incident_date.localeCompare(a.incident_date));
      setRecords(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  // Advisories are warnings, not incidents: they get their own panel and are
  // kept out of every count below.
  const advisories = useMemo(() => records.filter(isOfficialAdvisory), [records]);
  const incidents = useMemo(
    () => records.filter((incident) => !isOfficialAdvisory(incident)),
    [records]
  );
  const typed = useMemo(
    () => incidents.map((incident) => ({ incident, type: cyberTypeOf(incident) })),
    [incidents]
  );
  const typeRows = useMemo(() => tally(typed.map((row) => row.type)), [typed]);
  const platformRows = useMemo(
    () => tally(incidents.map(platformOf)).filter((row) => row.key !== "Unknown"),
    [incidents]
  );
  const districtRows = useMemo(
    () => tally(incidents.map((incident) => incident.district)).slice(0, 8),
    [incidents]
  );
  const personal = typed.filter((row) => PERSONAL_HARMS.has(row.type)).length;
  const visible = typed.filter((row) => typeFilter === null || row.type === typeFilter);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Cyber</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Reported cybercrime in Bangladesh: online and mobile-money fraud,
            sextortion, online harassment, hacking and attacks on organisations,
            alongside national CERT advisories. Built from public news reporting,
            so it shows what was reported, not how much happened.
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Time window">
          {WINDOWS.map((window) => (
            <button
              key={window.days}
              type="button"
              onClick={() => setDays(window.days)}
              className={cn("btn px-3 py-1 text-xs", days === window.days && "btn-accent")}
            >
              {window.label}
            </button>
          ))}
        </div>
      </header>

      {/* Headline numbers */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
        {[
          { icon: ShieldAlert, label: "Cyber incidents", value: incidents.length },
          { icon: Users, label: "Harm to individuals", value: personal, note: "mobile money, sextortion, harassment, hacking" },
          { icon: Smartphone, label: "Top type", text: typeRows[0] ? CYBER_TYPE_LABEL[typeRows[0].key] : "—" },
          { icon: BookOpen, label: "CERT advisories", value: advisories.length },
        ].map((card) => (
          <div key={card.label} className="panel p-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <card.icon className="h-4 w-4" aria-hidden />
              <span className="label-mono">{card.label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-100">
              {loading ? "…" : card.text ?? formatNumber(card.value ?? 0)}
            </p>
            {card.note && <p className="mt-1 text-[11px] text-zinc-600">{card.note}</p>}
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="panel" aria-label="By type">
          <header className="panel-header">
            <span className="label-mono">By type</span>
          </header>
          <div className="p-4">
            <Bars
              loading={loading}
              rows={typeRows.map((row) => ({
                label: CYBER_TYPE_LABEL[row.key],
                count: row.count,
                title: CYBER_TYPE_HELP[row.key],
              }))}
              help="Typed by keyword from each record's summary, using the categories of the cybercrime research codebook. A first pass, not hand-validated coding."
            />
          </div>
        </section>
        <section className="panel" aria-label="By platform">
          <header className="panel-header">
            <span className="label-mono">By platform</span>
          </header>
          <div className="p-4">
            <Bars
              loading={loading}
              rows={platformRows.map((row) => ({ label: row.key, count: row.count }))}
              help="Only records whose summary names a platform are counted."
            />
          </div>
        </section>
        <section className="panel" aria-label="By district">
          <header className="panel-header">
            <span className="label-mono">By district</span>
          </header>
          <div className="p-4">
            <Bars
              loading={loading}
              rows={districtRows.map((row) => ({ label: row.key, count: row.count }))}
              help="Where the incident or arrest was reported, not where the victim or offender was online."
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="panel" aria-label="Cyber incidents">
          <header className="panel-header flex flex-wrap items-center gap-2">
            <span className="label-mono mr-2">Incidents</span>
            <button
              type="button"
              onClick={() => setTypeFilter(null)}
              className={cn("btn px-2 py-0.5 text-[11px]", typeFilter === null && "btn-accent")}
            >
              All
            </button>
            {typeRows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => setTypeFilter(row.key)}
                className={cn("btn px-2 py-0.5 text-[11px]", typeFilter === row.key && "btn-accent")}
              >
                {CYBER_TYPE_LABEL[row.key]} · {row.count}
              </button>
            ))}
          </header>
          <div className="flex flex-col gap-2.5 p-3">
            {loading ? (
              <div className="skeleton h-40 w-full rounded" />
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                No cyber incidents reported in this window yet. Try a longer window.
              </p>
            ) : (
              visible.map(({ incident, type }) => (
                <div key={incident.id}>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-cyan-400/80">
                    {CYBER_TYPE_LABEL[type]}
                  </p>
                  <IncidentCard incident={incident} />
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="panel" aria-label="CERT advisories">
            <header className="panel-header">
              <span className="label-mono">BGD e-GOV CIRT advisories</span>
            </header>
            <div className="flex flex-col gap-2.5 p-3">
              {loading ? (
                <div className="skeleton h-24 w-full rounded" />
              ) : advisories.length === 0 ? (
                <p className="text-xs text-zinc-500">No fraud or abuse advisories in this window.</p>
              ) : (
                advisories.slice(0, 8).map((incident) => (
                  <a
                    key={incident.id}
                    href={incident.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded border border-surface-border/60 p-2.5 text-xs text-zinc-300 hover:border-surface-border"
                  >
                    {incident.title}
                  </a>
                ))
              )}
            </div>
          </section>

          <section className="panel p-4 text-xs leading-relaxed text-zinc-400" aria-label="About">
            <p className="label-mono mb-2">Protect yourself</p>
            <p>
              No bank or bKash/Nagad agent will ever ask for your PIN or OTP.
              To report harassment or sextortion, women can contact Police Cyber
              Support for Women (PCSW) via its Facebook page, and anyone can
              call 999. Step-by-step patterns for the common scams are on the{" "}
              <Link href="/ttp" className="text-accent-soft hover:text-accent">
                TTP &amp; Treatment
              </Link>{" "}
              page.
            </p>
            <p className="label-mono mb-2 mt-4">Research</p>
            <p>
              This view is the public face of an ongoing study mapping
              cybercrime in Bangladesh from news reporting and CERT advisories,
              2018–2026.{" "}
              <a
                href={RESEARCH_PLAN_URL}
                target="_blank"
                rel="noreferrer"
                className="text-accent-soft hover:text-accent"
              >
                Read the research plan
              </a>
              .
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
