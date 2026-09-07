"use client";

import { AlertTriangle, ShieldOff } from "lucide-react";

import type { TTPStage } from "@/types/crime";
import { cn } from "@/lib/utils";

interface ThreatChainProps {
  stages: TTPStage[];
  accent: string;
  /** Currently focused stage, or null for "show the whole chain". */
  selected: number | null;
  onSelect: (index: number | null) => void;
  /** Count of treatments biting at each stage, keyed by stage index. */
  treatmentCounts: Record<number, number>;
}

/**
 * The offender's sequence, rendered as a chain you can step through.
 *
 * The point of drawing it this way is that the stages are ordered and the
 * early ones are where intervention is cheap. A bulleted list flattens that;
 * a chain makes "this is the last point at which it costs nothing" visible.
 *
 * Selecting a stage filters the treatment list below to the controls that act
 * there, which is the actual question a reader has: not "what could I do"
 * but "what can I still do from here".
 */
export default function ThreatChain({
  stages,
  accent,
  selected,
  onSelect,
  treatmentCounts,
}: ThreatChainProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <ol className="flex min-w-max items-stretch gap-0">
        {stages.map((stage, index) => {
          const isSelected = selected === index;
          const dimmed = selected !== null && !isSelected;
          const count = treatmentCounts[index] ?? 0;

          return (
            <li key={stage.name} className="flex items-stretch">
              {index > 0 && (
                <span
                  aria-hidden
                  className="mt-[1.15rem] h-px w-5 shrink-0 self-start bg-surface-border sm:w-7"
                />
              )}

              <button
                type="button"
                onClick={() => onSelect(isSelected ? null : index)}
                aria-pressed={isSelected}
                className={cn(
                  "group w-[10.5rem] rounded-lg border p-2.5 text-left transition-all sm:w-[12.5rem]",
                  isSelected
                    ? "bg-surface-overlay/80"
                    : "border-surface-border/60 bg-surface-raised/50 hover:border-surface-border",
                  dimmed && "opacity-45"
                )}
                style={
                  isSelected
                    ? { borderColor: `${accent}99`, boxShadow: `0 0 0 1px ${accent}44` }
                    : undefined
                }
              >
                <span className="mb-1.5 flex items-center gap-1.5">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold"
                    style={{
                      color: accent,
                      backgroundColor: `${accent}1f`,
                      border: `1px solid ${accent}66`,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span className="truncate text-xs font-semibold text-zinc-100">
                    {stage.name}
                  </span>
                </span>

                <span className="block text-[11px] leading-relaxed text-zinc-500 line-clamp-3">
                  {stage.description}
                </span>

                <span className="mt-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider">
                  {stage.indicators.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-500/80">
                      <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
                      {stage.indicators.length} sign
                      {stage.indicators.length === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-zinc-600"
                      title="Nothing is observable to a potential victim at this stage"
                    >
                      <ShieldOff className="h-2.5 w-2.5" aria-hidden />
                      no warning
                    </span>
                  )}

                  {count > 0 && (
                    <span className="ml-auto text-zinc-500">
                      {count} control{count === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
