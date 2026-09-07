/**
 * Presentation helpers shared across the dashboard.
 *
 * Everything time-related renders in Bangladesh Standard Time (UTC+6) so a
 * timestamp means the same thing to a reader in Dhaka and one in London.
 */

import type {
  CrimeCategory,
  CrimeIncident,
  SeverityLevel,
  SourceFilter,
  SourcePlatform,
  TrustTier,
  VerificationLevel,
} from "@/types/crime";

export const BST_TIMEZONE = "Asia/Dhaka";
export const DHAKA_CENTER: [number, number] = [23.8103, 90.4125];

/** Tailwind-safe class joiner. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

const SEVERITY_BY_CATEGORY: Record<CrimeCategory, SeverityLevel> = {
  Homicide: "critical",
  Robbery: "high",
  Extortion: "high",
  Assault: "medium",
  Narcotics: "medium",
  Cybercrime: "low",
  Fraud: "low",
  Theft: "low",
  Other: "unknown",
};

export function severityOf(category: CrimeCategory): SeverityLevel {
  return SEVERITY_BY_CATEGORY[category] ?? "unknown";
}

/**
 * Hex values, not Tailwind classes. Leaflet markers and Recharts both need a
 * literal colour string, and keeping one source avoids the map and the chart
 * drifting apart.
 */
export const SEVERITY_HEX: Record<SeverityLevel, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#d97706",
  low: "#0891b2",
  unknown: "#71717a",
};

export function categoryColor(category: CrimeCategory): string {
  return SEVERITY_HEX[severityOf(category)];
}

/** Tailwind classes for the coloured rule down the left of an incident card. */
export const SEVERITY_BAR_CLASS: Record<SeverityLevel, string> = {
  critical: "bg-severity-critical",
  high: "bg-severity-high",
  medium: "bg-severity-medium",
  low: "bg-severity-low",
  unknown: "bg-severity-unknown",
};

export const SEVERITY_TEXT_CLASS: Record<SeverityLevel, string> = {
  critical: "text-severity-critical",
  high: "text-severity-high",
  medium: "text-severity-medium",
  low: "text-severity-low",
  unknown: "text-severity-unknown",
};

/** Marker radius in pixels - more serious incidents read larger on the map. */
export function severityRadius(category: CrimeCategory): number {
  switch (severityOf(category)) {
    case "critical":
      return 11;
    case "high":
      return 9;
    case "medium":
      return 8;
    case "low":
      return 7;
    default:
      return 6;
  }
}

// ---------------------------------------------------------------------------
// Source trust
// ---------------------------------------------------------------------------

const TRUST_BY_PLATFORM: Record<SourcePlatform, TrustTier> = {
  police_report: "official",
  news_portal: "news",
  facebook_public: "social",
  telegram_channel: "social",
};

/**
 * Corroboration state, shown separately from the trust tier because they
 * answer different questions: the tier says who published a claim, this says
 * whether anyone else confirmed it.
 */
export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  unverified: "Unconfirmed",
  single_source: "Single source",
  corroborated: "Corroborated",
};

export const VERIFICATION_CLASS: Record<VerificationLevel, string> = {
  unverified: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  single_source: "border-surface-border bg-surface-overlay/60 text-zinc-400",
  corroborated: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
};

export function trustTier(platform: SourcePlatform): TrustTier {
  return TRUST_BY_PLATFORM[platform] ?? "social";
}

export const TRUST_LABEL: Record<TrustTier, string> = {
  official: "Official",
  news: "Verified News",
  social: "Public Social",
};

export const TRUST_DOT: Record<TrustTier, string> = {
  official: "🟢",
  news: "🟡",
  social: "🟠",
};

export const TRUST_CLASS: Record<TrustTier, string> = {
  official: "border-trust-official/40 text-trust-official bg-trust-official/10",
  news: "border-trust-news/40 text-trust-news bg-trust-news/10",
  social: "border-trust-social/40 text-trust-social bg-trust-social/10",
};

/** Maps the UI's source filter onto the backend's source_platform values. */
export function sourceFilterToPlatform(
  filter: SourceFilter
): SourcePlatform | null {
  switch (filter) {
    case "verified_news":
      return "news_portal";
    case "public_social":
      return "facebook_public";
    case "official":
      return "police_report";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** "3 hours ago", "just now", "12 Mar" for anything older than a month. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown time";

  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 0) return "just now"; // clock skew, or a same-day report
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return formatDateBST(iso);
}

/** "12 Mar 2026" in BST. */
export function formatDateBST(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown date";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** "12 Mar 2026, 21:40 BST". */
export function formatDateTimeBST(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown time";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: BST_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${formatted} BST`;
}

/** Current wall-clock time in Dhaka, as HH:MM:SS. */
export function currentBSTClock(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

/** Short axis tick: "12 Mar". */
export function formatChartDate(isoDate: string): string {
  // Trend points are plain YYYY-MM-DD; anchor them at noon UTC so the label
  // cannot slide a day either way when re-projected into BST.
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BST_TIMEZONE,
    day: "numeric",
    month: "short",
  }).format(date);
}

/** ISO timestamp for "N days ago", used to build query strings. */
export function daysAgoISO(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

// ---------------------------------------------------------------------------
// Text + numbers
// ---------------------------------------------------------------------------

export function truncate(text: string, max = 220): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** "+18.4%" / "-6.0%" / "0.0%" for the week-over-week delta. */
export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

// ---------------------------------------------------------------------------
// CSV export (client-side, no server round trip)
// ---------------------------------------------------------------------------

const CSV_COLUMNS: Array<keyof CrimeIncident> = [
  "id",
  "incident_date",
  "title",
  "crime_category",
  "thana_name",
  "district",
  "latitude",
  "longitude",
  "penal_code_tags",
  "fir_or_gd",
  "source_platform",
  "source_handle",
  "verification_level",
  "source_confidence",
  "source_url",
  "narrative",
];

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join("; ") : String(value);

  // A leading =, +, - or @ makes Excel treat the cell as a formula. Prefixing
  // an apostrophe keeps an exported narrative from executing in a spreadsheet.
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;

  return `"${guarded.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

export function incidentsToCsv(incidents: CrimeIncident[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = incidents.map((incident) =>
    CSV_COLUMNS.map((column) => escapeCsvCell(incident[column])).join(",")
  );
  // BOM so Excel opens Bengali text as UTF-8 rather than mojibake.
  return `﻿${[header, ...rows].join("\r\n")}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
