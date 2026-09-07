"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Crosshair, Info, Landmark, Phone, User, Users } from "lucide-react";

import RequireAuth from "@/components/auth/RequireAuth";
import TTPCard from "@/components/ttp/TTPCard";
import { fetchTTPProfiles } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";
import {
  threatClassColor,
  TREATMENT_CLASS,
  TREATMENT_LABEL,
  TREATMENT_MEANING,
} from "@/lib/ttp";
import {
  TREATMENT_KINDS,
  type TreatmentAudience,
  type TTPResponse,
} from "@/types/crime";

const WINDOWS = [90, 180, 365] as const;

const AUDIENCE_TABS: Array<{
  value: TreatmentAudience | null;
  label: string;
  icon: typeof Users;
}> = [
  { value: null, label: "Both", icon: Users },
  { value: "citizen", label: "Citizen", icon: User },
  { value: "law_enforcement", label: "Law enforcement", icon: Landmark },
];

/**
 * Verified against a primary government source before publication. A wrong
 * number in a crisis is worse than no number, so anything that could not be
 * confirmed on a .gov.bd page is deliberately absent from this list.
 */
const CONTACTS = [
  { code: "999", label: "National emergency", note: "Police, fire, ambulance" },
  { code: "16121", label: "Consumer complaints", note: "DNCRP, 24/7 — fraud and refunds" },
  { code: "333", label: "Government services", note: "Information and referral" },
  { code: "102", label: "Fire service", note: "Fire and rescue" },
];

function TTPPage() {
  const [data, setData] = useState<TTPResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(90);
  const [audience, setAudience] = useState<TreatmentAudience | null>(null);
  const [threatClass, setThreatClass] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void fetchTTPProfiles(days).then((response) => {
      if (cancelled) return;
      setData(response);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [days]);

  const profiles = useMemo(() => {
    if (!data) return [];
    return threatClass
      ? data.profiles.filter((item) => item.threat_class === threatClass)
      : data.profiles;
  }, [data, threatClass]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="mb-6">
        <p className="label-mono">Pattern analysis · risk treatment</p>
        <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-zinc-100">
          <Crosshair className="h-6 w-6 text-accent-soft" aria-hidden />
          TTP &amp; Risk Treatment
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          Offences are not random events. Fraud, trafficking and most homicide
          follow a sequence — the offender has to complete every step, which
          means every step is somewhere the sequence can be broken. Each
          profile below sets out that sequence, what is observable at each
          stage, and what a citizen and an investigator can each do about it.
        </p>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* How to read this                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel mb-6 p-4">
        <p className="label-mono mb-3 flex items-center gap-1.5">
          <Info className="h-3 w-3" aria-hidden />
          Treatments use four options, not one
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {TREATMENT_KINDS.map((kind) => (
            <div
              key={kind}
              className="rounded-lg border border-surface-border/60 bg-surface-overlay/40 p-2.5"
            >
              <span className={cn("chip", TREATMENT_CLASS[kind])}>
                {TREATMENT_LABEL[kind]}
              </span>
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                {TREATMENT_MEANING[kind]}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
          Distinguishing them matters: &ldquo;be careful&rdquo; is an accept
          dressed up as a reduce, and a control that moves a loss to a
          regulator is not the same as one that stops it happening.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Controls                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="panel mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 p-3">
        <div className="flex items-center gap-1.5">
          <span className="label-mono mr-1">Written for</span>
          {AUDIENCE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = audience === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setAudience(tab.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  active
                    ? "border-accent/50 bg-accent/15 text-accent-soft"
                    : "border-surface-border bg-surface-overlay/60 text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="label-mono mr-1">Window</span>
          {WINDOWS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              aria-pressed={days === value}
              className={cn(
                "rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                days === value
                  ? "border-accent/50 bg-accent/15 text-accent-soft"
                  : "border-surface-border bg-surface-overlay/60 text-zinc-400 hover:text-zinc-200"
              )}
            >
              {value}d
            </button>
          ))}
        </div>

        {data && (
          <span className="ml-auto font-mono text-[10px] text-zinc-500">
            {formatNumber(data.archive_total)} records in window
          </span>
        )}
      </div>

      {/* Threat class filter */}
      {data && data.threat_classes.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setThreatClass(null)}
            aria-pressed={threatClass === null}
            className={cn(
              "chip transition-colors",
              threatClass === null
                ? "border-zinc-400/50 bg-zinc-400/10 text-zinc-200"
                : "border-surface-border bg-surface-overlay/60 text-zinc-500 hover:text-zinc-300"
            )}
          >
            All ({data.profiles.length})
          </button>
          {data.threat_classes.map((name) => {
            const active = threatClass === name;
            const color = threatClassColor(name);
            const count = data.profiles.filter(
              (item) => item.threat_class === name
            ).length;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setThreatClass(active ? null : name)}
                aria-pressed={active}
                className="chip transition-colors"
                style={{
                  color: active ? color : undefined,
                  borderColor: active ? `${color}66` : undefined,
                  backgroundColor: active ? `${color}1a` : undefined,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                {name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Profiles                                                            */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="skeleton h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <p className="panel p-6 text-center text-sm text-zinc-500">
          No profiles for this filter.
        </p>
      ) : (
        <div className="space-y-4">
          {profiles.map((profile) => (
            <TTPCard
              key={profile.id}
              profile={profile}
              audience={audience}
              windowDays={data?.window_days ?? days}
            />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Reporting channels                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="panel mt-8 p-4">
        <p className="label-mono mb-3 flex items-center gap-1.5">
          <Phone className="h-3 w-3" aria-hidden />
          Reporting channels
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {CONTACTS.map((contact) => (
            <div
              key={contact.code}
              className="rounded-lg border border-surface-border/60 bg-surface-overlay/40 p-3"
            >
              <p className="font-mono text-lg font-semibold text-zinc-100">
                {contact.code}
              </p>
              <p className="mt-0.5 text-xs font-medium text-zinc-300">
                {contact.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                {contact.note}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
          Police Cyber Support for Women:{" "}
          <span className="font-mono text-zinc-400">
            cybersupport.women@police.gov.bd
          </span>
          . Every number here was checked against a primary government source;
          channels that could not be verified are deliberately not listed.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Limits                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">
          What this section is and is not
        </h2>
        <div className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-400">
          <p>
            The pattern descriptions are authored, not generated — they are
            stable, reviewed text rather than model output regenerated on every
            ingest. What is computed live is prevalence: the count beside each
            profile is a real query against the archive over the selected
            window, and profiles the archive under-counts are labelled as such
            rather than shown as confident figures.
          </p>
          <p>
            It is general guidance, not advice on your situation, and not a
            substitute for the police or a lawyer. Prevalence reflects what the{" "}
            <Link
              href="/methodology"
              className="text-accent-soft hover:text-accent"
            >
              collection pipeline
            </Link>{" "}
            captured, which is a fraction of what occurred — under-reported
            offences look rare here for the same reason they are
            under-reported.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <TTPPage />
    </RequireAuth>
  );
}
