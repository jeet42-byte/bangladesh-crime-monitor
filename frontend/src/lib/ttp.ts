/**
 * Presentation vocabulary for the TTP section.
 *
 * The treatment colours carry meaning and are not decorative: a reader
 * scanning a profile should be able to tell an "avoid" from an "accept"
 * without reading either, because those two demand opposite behaviour.
 */

import type {
  ArchiveSupport,
  TreatmentAudience,
  TreatmentKind,
} from "@/types/crime";

export const TREATMENT_LABEL: Record<TreatmentKind, string> = {
  avoid: "Avoid",
  reduce: "Reduce",
  share: "Share",
  accept: "Accept",
};

/** One line on what each ISO 31000 option actually commits you to. */
export const TREATMENT_MEANING: Record<TreatmentKind, string> = {
  avoid: "Do not take the risk at all — remove the exposure.",
  reduce: "Take it, but cut the likelihood or the impact.",
  share: "Transfer part of it — to a regulator, an insurer, an institution.",
  accept: "Carry it knowingly, because the alternatives are worse.",
};

export const TREATMENT_CLASS: Record<TreatmentKind, string> = {
  avoid: "border-severity-critical/45 bg-severity-critical/10 text-severity-critical",
  reduce: "border-severity-medium/45 bg-severity-medium/10 text-severity-medium",
  share: "border-severity-low/45 bg-severity-low/10 text-severity-low",
  accept: "border-zinc-600/60 bg-zinc-700/20 text-zinc-400",
};

/** Left rule on a treatment row, so the kind reads at a glance in a list. */
export const TREATMENT_RULE: Record<TreatmentKind, string> = {
  avoid: "bg-severity-critical",
  reduce: "bg-severity-medium",
  share: "bg-severity-low",
  accept: "bg-zinc-600",
};

export const AUDIENCE_LABEL: Record<TreatmentAudience, string> = {
  citizen: "Citizen",
  law_enforcement: "Law enforcement",
};

export const ARCHIVE_SUPPORT_LABEL: Record<ArchiveSupport, string> = {
  direct: "Directly evidenced",
  partial: "Under-counted",
  absent: "Not measurable",
};

export const ARCHIVE_SUPPORT_CLASS: Record<ArchiveSupport, string> = {
  direct: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  partial: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  absent: "border-zinc-600/60 bg-zinc-700/20 text-zinc-400",
};

/** Colour per threat class, used for the chain accent and the class tabs. */
export const THREAT_CLASS_HEX: Record<string, string> = {
  Fraud: "#0891b2",
  "Human trafficking": "#a855f7",
  Homicide: "#dc2626",
  "Violent acquisitive": "#ea580c",
  Extortion: "#d97706",
};

export function threatClassColor(threatClass: string): string {
  return THREAT_CLASS_HEX[threatClass] ?? "#71717a";
}

/**
 * Share of a pattern's categories that match its terms, as a percentage.
 *
 * Returns null rather than 0 when there is nothing in the categories at all,
 * so the UI can say "no records in window" instead of drawing a confident
 * empty bar that reads as "this never happens".
 */
export function prevalenceShare(
  observed: number,
  categoryTotal: number
): number | null {
  if (categoryTotal <= 0) return null;
  return (observed / categoryTotal) * 100;
}
