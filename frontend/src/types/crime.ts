/**
 * Shared domain types. These mirror the FastAPI response models exactly - if
 * the backend changes shape, change it here first and let the compiler find
 * every call site.
 */

export const CRIME_CATEGORIES = [
  "Homicide",
  "Robbery",
  "Assault",
  "Narcotics",
  "Cybercrime",
  "Fraud",
  "Extortion",
  "Theft",
  "Other",
] as const;

export type CrimeCategory = (typeof CRIME_CATEGORIES)[number];

export const SOURCE_PLATFORMS = [
  "news_portal",
  "facebook_public",
  "police_report",
  "telegram_channel",
] as const;

export type SourcePlatform = (typeof SOURCE_PLATFORMS)[number];

/** How well corroborated a claim is, as distinct from who published it. */
export const VERIFICATION_LEVELS = [
  "unverified",
  "single_source",
  "corroborated",
] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

/** Severity band driving marker colour and the card's left rule. */
export type SeverityLevel = "critical" | "high" | "medium" | "low" | "unknown";

/** Trust tier shown as the badge on each incident card. */
export type TrustTier = "official" | "news" | "social";

// ---------------------------------------------------------------------------
// Core records
// ---------------------------------------------------------------------------

export interface CrimeIncident {
  id: string;
  title: string;
  narrative: string;
  crime_category: CrimeCategory;
  penal_code_tags: string[];
  /** ISO-8601, timezone-aware. */
  incident_date: string;
  thana_name: string;
  district: string;
  latitude: number;
  longitude: number;
  fir_or_gd: string | null;
  source_platform: SourcePlatform;
  source_url: string;
  source_confidence: number;
  /** Outlet or channel the record came from, e.g. "Channel 24". */
  source_handle: string | null;
  verification_level: VerificationLevel;
  created_at: string;
}

export interface CrimeFeedResponse {
  items: CrimeIncident[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// ---------------------------------------------------------------------------
// GeoJSON (RFC 7946 subset actually returned by /crimes/geojson)
// ---------------------------------------------------------------------------

export interface CrimeFeatureProperties {
  id: string;
  title: string;
  narrative: string;
  crime_category: CrimeCategory;
  penal_code_tags: string[];
  incident_date: string;
  thana_name: string;
  district: string;
  source_platform: SourcePlatform;
  source_url: string;
  source_confidence: number;
  source_handle: string | null;
  verification_level: VerificationLevel;
  fir_or_gd: string | null;
}

export interface CrimeFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    /** GeoJSON order: [longitude, latitude]. */
    coordinates: [number, number];
  };
  properties: CrimeFeatureProperties;
}

export interface CrimeGeoJSON {
  type: "FeatureCollection";
  features: CrimeFeature[];
  metadata: {
    count: number;
    window_start: string;
    window_end: string;
    truncated: boolean;
  };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface CrimeAnalyticsSummary {
  total_30d: number;
  total_7d: number;
  total_previous_7d: number;
  change_7d_pct: number;
  top_category: CrimeCategory | null;
  top_category_count: number;
  highest_risk_thana: string | null;
  highest_risk_thana_count: number;
  verified_source_count: number;
  verified_source_ratio: number;
  total_all_time: number;
  last_ingest_at: string | null;
  window_days: number;
}

export interface TrendPoint {
  /** YYYY-MM-DD in Bangladesh Standard Time. */
  date: string;
  count: number;
}

export interface TrendsResponse {
  points: TrendPoint[];
  window_days: number;
  total: number;
  daily_average: number;
}

export interface CategoryCount {
  category: CrimeCategory;
  count: number;
  share_pct: number;
}

export interface CategoriesResponse {
  categories: CategoryCount[];
  window_days: number;
  total: number;
}

export interface ThanaCount {
  thana_name: string;
  count: number;
  latitude: number;
  longitude: number;
}

export interface ThanaRankingResponse {
  thanas: ThanaCount[];
  window_days: number;
}

export interface SourceMixEntry {
  source_platform: SourcePlatform;
  label: string;
  count: number;
  share_pct: number;
  avg_confidence: number;
}

export interface SourceMixResponse {
  window_days: number;
  total: number;
  sources: SourceMixEntry[];
}

export interface HourlyBucket {
  hour: number;
  count: number;
}

export interface HourlyResponse {
  window_days: number;
  hours: HourlyBucket[];
}

// ---------------------------------------------------------------------------
// Reference data + client-side filter state
// ---------------------------------------------------------------------------

export interface Thana {
  thana_name: string;
  district: string;
  division: string;
  latitude: number;
  longitude: number;
}

/** UI-level source grouping; maps onto zero or one SourcePlatform. */
export type SourceFilter = "all" | "verified_news" | "public_social" | "official";

export interface FilterState {
  thana: string | null;
  category: CrimeCategory | null;
  source: SourceFilter;
  /** Rolling window in days; drives both start_date and the chart windows. */
  days: number;
  search: string;
}

export const DEFAULT_FILTERS: FilterState = {
  thana: null,
  category: null,
  source: "all",
  days: 30,
  search: "",
};

/** Shape returned when a fetch fails; the UI renders this instead of crashing. */
export interface ApiError {
  message: string;
  status: number | null;
}
