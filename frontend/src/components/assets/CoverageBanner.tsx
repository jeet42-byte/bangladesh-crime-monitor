"use client";

import { AlertOctagon, Info, ShieldAlert } from "lucide-react";

import type { Coverage, CoverageSignal } from "@/types/crime";
import { cn } from "@/lib/utils";

/**
 * The most important element on the exposure page, and deliberately the
 * loudest one when the news is bad.
 *
 * At this archive's density most sites return zero nearby incidents. Rendered
 * as a quiet "0", that reads as "safe" — which is false, and worse than
 * useless to someone making a security decision. So when collection is thin
 * or absent, the caveat outranks the number visually: it sits above the
 * count, in warning colours, at full width.
 *
 * The rule this encodes: never let the interface imply more confidence than
 * the data supports.
 */

const SIGNAL_STYLE: Record<
  CoverageSignal,
  { class: string; icon: typeof Info; label: string }
> = {
  no_signal: {
    class: "border-severity-critical/45 bg-severity-critical/10",
    icon: AlertOctagon,
    label: "No collection — this is not a risk finding",
  },
  thin: {
    class: "border-amber-500/45 bg-amber-500/10",
    icon: ShieldAlert,
    label: "Coverage too thin to infer from",
  },
  adequate: {
    class: "border-surface-border bg-surface-overlay/40",
    icon: Info,
    label: "Collection basis",
  },
};

const SIGNAL_TEXT: Record<CoverageSignal, string> = {
  no_signal: "text-severity-critical",
  thin: "text-amber-400",
  adequate: "text-zinc-400",
};

interface CoverageBannerProps {
  coverage: Coverage;
  windowDays: number;
}

export default function CoverageBanner({
  coverage,
  windowDays,
}: CoverageBannerProps) {
  const style = SIGNAL_STYLE[coverage.signal];
  const Icon = style.icon;

  return (
    <section
      className={cn("rounded-xl border p-4", style.class)}
      role={coverage.signal === "adequate" ? undefined : "alert"}
    >
      <p
        className={cn(
          "mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]",
          SIGNAL_TEXT[coverage.signal]
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {style.label}
      </p>

      <p className="text-sm leading-relaxed text-zinc-300">
        {coverage.interpretation}
      </p>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-surface-border/50 pt-2.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        <div className="flex gap-1.5">
          <dt>District records</dt>
          <dd className="text-zinc-300">{coverage.district_records}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>National records</dt>
          <dd className="text-zinc-300">{coverage.national_records}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Window</dt>
          <dd className="text-zinc-300">{windowDays}d</dd>
        </div>
      </dl>
    </section>
  );
}
