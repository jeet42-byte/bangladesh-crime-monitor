"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  Landmark,
  ShieldCheck,
  User,
} from "lucide-react";

import ThreatChain from "@/components/ttp/ThreatChain";
import type { TreatmentAudience, TTPProfile } from "@/types/crime";
import { cn, formatDateBST } from "@/lib/utils";
import {
  ARCHIVE_SUPPORT_CLASS,
  ARCHIVE_SUPPORT_LABEL,
  AUDIENCE_LABEL,
  prevalenceShare,
  threatClassColor,
  TREATMENT_CLASS,
  TREATMENT_LABEL,
  TREATMENT_RULE,
} from "@/lib/ttp";

interface TTPCardProps {
  profile: TTPProfile;
  /** null shows both columns side by side. */
  audience: TreatmentAudience | null;
  windowDays: number;
}

const AUDIENCE_ICON: Record<TreatmentAudience, typeof User> = {
  citizen: User,
  law_enforcement: Landmark,
};

export default function TTPCard({
  profile,
  audience,
  windowDays,
}: TTPCardProps) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<number | null>(null);

  const accent = threatClassColor(profile.threat_class);
  const share = prevalenceShare(profile.observed_count, profile.category_total);

  const treatmentCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const treatment of profile.treatments) {
      if (audience && treatment.audience !== audience) continue;
      counts[treatment.stage_index] = (counts[treatment.stage_index] ?? 0) + 1;
    }
    return counts;
  }, [profile.treatments, audience]);

  const audiences: TreatmentAudience[] = audience
    ? [audience]
    : ["citizen", "law_enforcement"];

  return (
    <article className="panel overflow-hidden">
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-stretch">
        <span
          className="w-1 shrink-0"
          style={{ backgroundColor: accent }}
          aria-hidden
        />

        <div className="min-w-0 flex-1 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="chip"
              style={{
                color: accent,
                borderColor: `${accent}66`,
                backgroundColor: `${accent}1a`,
              }}
            >
              {profile.threat_class}
            </span>

            <span
              className={cn("chip", ARCHIVE_SUPPORT_CLASS[profile.archive_support])}
              title={profile.support_note}
            >
              {ARCHIVE_SUPPORT_LABEL[profile.archive_support]}
            </span>

            {profile.last_seen && (
              <span className="ml-auto font-mono text-[10px] text-zinc-500">
                last seen {formatDateBST(profile.last_seen)}
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold leading-snug text-zinc-100">
            {profile.name}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {profile.summary}
          </p>

          {/* ------------------------------------------------------------ */}
          {/* Prevalence. The denominator is shown because a bare count is  */}
          {/* unreadable: 6 records means nothing without knowing 6 of what.*/}
          {/* ------------------------------------------------------------ */}
          <div className="mt-3.5 rounded-lg border border-surface-border/60 bg-surface-overlay/40 p-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-mono text-lg font-semibold text-zinc-100">
                {profile.observed_count}
              </span>
              <span className="text-xs text-zinc-500">
                of {profile.category_total} records in{" "}
                {profile.categories.join(" / ")} over {windowDays} days
              </span>
              {share !== null && (
                <span
                  className="ml-auto font-mono text-[11px]"
                  style={{ color: accent }}
                >
                  {share.toFixed(0)}%
                </span>
              )}
            </div>

            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-border/60"
              role="img"
              aria-label={`${profile.observed_count} of ${profile.category_total} records match this pattern`}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, share ?? 0)}%`,
                  backgroundColor: accent,
                }}
              />
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
              {profile.support_note}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <ChevronDown
              className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
              aria-hidden
            />
            {open ? "Hide" : "Chain, warning signs & treatments"}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Body                                                              */}
      {/* ---------------------------------------------------------------- */}
      {open && (
        <div className="animate-fade-up border-t border-surface-border/60 bg-surface-base/30 p-4">
          <p className="label-mono mb-2.5">Sequence — select a stage</p>
          <ThreatChain
            stages={profile.stages}
            accent={accent}
            selected={stage}
            onSelect={setStage}
            treatmentCounts={treatmentCounts}
          />

          {/* Warning signs for the focused stage. Only shown on selection:
              rendering every indicator at once is a wall of text nobody
              reads, and the indicators are only actionable in context. */}
          {stage !== null && (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                <Eye className="h-3 w-3" aria-hidden />
                What you can see at &ldquo;{profile.stages[stage].name}&rdquo;
              </p>
              {profile.stages[stage].indicators.length > 0 ? (
                <ul className="space-y-1.5">
                  {profile.stages[stage].indicators.map((indicator) => (
                    <li
                      key={indicator}
                      className="flex gap-2 text-xs leading-relaxed text-zinc-300"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                      {indicator}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-zinc-500">
                  Nothing at this stage is observable from outside. By the time
                  it is visible the sequence has already moved on — which is
                  why the earlier stages carry the controls.
                </p>
              )}
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* Treatments                                                      */}
          {/* -------------------------------------------------------------- */}
          <div
            className={cn(
              "mt-4 grid gap-4",
              audiences.length > 1 && "lg:grid-cols-2"
            )}
          >
            {audiences.map((who) => {
              const Icon = AUDIENCE_ICON[who];
              const rows = profile.treatments.filter(
                (treatment) =>
                  treatment.audience === who &&
                  (stage === null || treatment.stage_index === stage)
              );

              return (
                <section key={who}>
                  <p className="label-mono mb-2 flex items-center gap-1.5">
                    <Icon className="h-3 w-3" aria-hidden />
                    {AUDIENCE_LABEL[who]}
                    {stage !== null && (
                      <span className="text-zinc-600">
                        · at stage {stage + 1}
                      </span>
                    )}
                  </p>

                  {rows.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-surface-border/70 p-3 text-xs leading-relaxed text-zinc-600">
                      No control listed for {AUDIENCE_LABEL[who].toLowerCase()}{" "}
                      at this stage. That is a finding, not an omission — the
                      leverage sits at another point in the chain.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {rows.map((treatment, index) => (
                        <li
                          key={`${treatment.kind}-${treatment.stage_index}-${index}`}
                          className="flex overflow-hidden rounded-lg border border-surface-border/60 bg-surface-raised/50"
                        >
                          <span
                            className={cn(
                              "w-0.5 shrink-0",
                              TREATMENT_RULE[treatment.kind]
                            )}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1 p-2.5">
                            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  "chip",
                                  TREATMENT_CLASS[treatment.kind]
                                )}
                              >
                                {TREATMENT_LABEL[treatment.kind]}
                              </span>
                              <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                                stage {treatment.stage_index + 1} ·{" "}
                                {profile.stages[treatment.stage_index]?.name}
                              </span>
                            </div>

                            <p className="text-xs leading-relaxed text-zinc-300">
                              {treatment.action}
                            </p>

                            {treatment.note && (
                              <p className="mt-1.5 border-l border-surface-border pl-2 text-[11px] leading-relaxed text-zinc-500">
                                {treatment.note}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          {profile.provenance && (
            <p className="mt-4 flex items-start gap-2 border-t border-surface-border/60 pt-3 text-[11px] leading-relaxed text-zinc-600">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {profile.provenance}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
