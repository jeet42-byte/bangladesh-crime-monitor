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

// ---------------------------------------------------------------------------
// TTP profiles + risk treatment
// ---------------------------------------------------------------------------

/** ISO 31000 treatment options. Four shapes, not one. */
export const TREATMENT_KINDS = ["avoid", "reduce", "share", "accept"] as const;
export type TreatmentKind = (typeof TREATMENT_KINDS)[number];

export type TreatmentAudience = "citizen" | "law_enforcement";

/** How well the archive can evidence a pattern - a claim about the dataset. */
export type ArchiveSupport = "direct" | "partial" | "absent";

export interface TTPStage {
  name: string;
  description: string;
  indicators: string[];
}

export interface TTPTreatment {
  kind: TreatmentKind;
  audience: TreatmentAudience;
  action: string;
  /** Index into the profile's `stages`. */
  stage_index: number;
  note: string;
}

export interface TTPProfile {
  id: string;
  name: string;
  threat_class: string;
  categories: CrimeCategory[];
  summary: string;
  archive_support: ArchiveSupport;
  support_note: string;
  provenance: string;
  stages: TTPStage[];
  treatments: TTPTreatment[];
  /** Records in the window matching this pattern. */
  observed_count: number;
  /** Records in the window in this pattern's categories - the denominator. */
  category_total: number;
  last_seen: string | null;
}

export interface TTPResponse {
  profiles: TTPProfile[];
  threat_classes: string[];
  window_days: number;
  archive_total: number;
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Asset exposure (ESRM view)
// ---------------------------------------------------------------------------

export interface CommercialSite {
  id: string;
  name: string;
  site_type: string;
  site_type_label: string;
  district: string;
  division: string;
  latitude: number;
  longitude: number;
  extent_km: number;
  note: string;
}

export interface SitesResponse {
  sites: CommercialSite[];
  site_types: string[];
  site_type_labels: Record<string, string>;
  precision_note: string;
}

export interface NearbyIncident {
  id: string;
  title: string;
  crime_category: CrimeCategory;
  incident_date: string;
  thana_name: string;
  district: string;
  distance_km: number;
  /** Coordinates are a district centroid; true location unknown. */
  district_level_only: boolean;
  source_platform: SourcePlatform;
  source_handle: string | null;
  verification_level: VerificationLevel;
  source_url: string;
}

/**
 * How much collection stands behind a result. A statement about the dataset,
 * never about the site — a nil return under "no_signal" means nothing was
 * collected, not that nothing happened.
 */
export type CoverageSignal = "no_signal" | "thin" | "adequate";

export interface Coverage {
  district_records: number;
  national_records: number;
  signal: CoverageSignal;
  interpretation: string;
}

export interface AnnexAControl {
  control: string;
  title: string;
}

export interface ApplicableThreat {
  id: string;
  name: string;
  threat_class: string;
  summary: string;
  archive_support: ArchiveSupport;
  iso27001_controls: AnnexAControl[];
}

export interface ExposureResponse {
  site: CommercialSite;
  radius_km: number;
  window_days: number;
  incident_count: number;
  by_category: Record<string, number>;
  incidents: NearbyIncident[];
  applicable_threats: ApplicableThreat[];
  coverage: Coverage;
  radius_warning: string | null;
  geocoding_note: string;
  resolution_warning: string | null;
  district_level_incidents: number;
  generated_at: string;
}
