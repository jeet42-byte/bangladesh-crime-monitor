/**
 * Typed client for the FastAPI backend.
 *
 * Two properties matter here, because the backend runs on Render's free tier:
 *
 * 1. **Nothing throws at the call site.** Every function returns a usable
 *    value - real data or a documented empty shape - so a cold backend
 *    degrades the dashboard instead of blanking it with an error boundary.
 * 2. **Cold starts are retried.** A sleeping Render service takes 30-50s to
 *    wake, which reads as a timeout on the first request after a quiet spell.
 */

import type {
  CategoriesResponse,
  CrimeAnalyticsSummary,
  CrimeFeedResponse,
  CrimeGeoJSON,
  CrimeIncident,
  FilterState,
  HourlyResponse,
  SourceMixResponse,
  Thana,
  ThanaRankingResponse,
  TrendsResponse,
} from "@/types/crime";
import { daysAgoISO, sourceFilterToPlatform } from "@/lib/utils";
import { clearGuestToken, readerHeader } from "@/lib/auth";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 20_000;
const COLD_START_RETRIES = 2;
const RETRY_DELAY_MS = 2_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core fetch wrapper: times out, retries transient failures, never throws.
 *
 * Returns `null` when the request could not be satisfied; each public function
 * decides what an empty result looks like for its own shape.
 */
async function request<T>(
  path: string,
  params: Record<string, string | number | null | undefined> = {},
  init: RequestInit = {}
): Promise<T | null> {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let retriedAuth = false;

  for (let attempt = 0; attempt <= COLD_START_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(await readerHeader()),
          ...(init.headers ?? {}),
        },
        // Incident data changes on a 6-hour cadence; a short revalidation
        // window keeps Vercel from hammering a free-tier backend while still
        // feeling live.
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        // A 401 usually means the cached guest token expired mid-session.
        // Drop it and try once with a fresh one before giving up.
        if (response.status === 401 && !retriedAuth) {
          retriedAuth = true;
          clearGuestToken();
          continue;
        }
        // Other 4xx are real answers - the request was wrong, retrying won't help.
        if (response.status >= 400 && response.status < 500) {
          console.warn(`[api] ${response.status} ${path}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      const isLast = attempt === COLD_START_RETRIES;
      if (isLast) {
        console.warn(`[api] ${path} failed after ${attempt + 1} attempts:`, error);
        return null;
      }
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Query-string construction
// ---------------------------------------------------------------------------

/** Translate UI filter state into backend query parameters. */
export function filtersToParams(
  filters: FilterState
): Record<string, string | number | null> {
  return {
    thana: filters.thana,
    category: filters.category,
    source_platform: sourceFilterToPlatform(filters.source),
    start_date: daysAgoISO(filters.days),
    search: filters.search.trim().length >= 2 ? filters.search.trim() : null,
  };
}

// ---------------------------------------------------------------------------
// Crimes
// ---------------------------------------------------------------------------

export const EMPTY_FEED: CrimeFeedResponse = {
  items: [],
  total: 0,
  limit: 0,
  offset: 0,
  has_more: false,
};

export async function fetchFeed(
  filters: FilterState,
  limit = 50,
  offset = 0
): Promise<CrimeFeedResponse> {
  const data = await request<CrimeFeedResponse>("/api/v1/crimes/feed", {
    ...filtersToParams(filters),
    limit,
    offset,
  });
  return data ?? EMPTY_FEED;
}

export const EMPTY_GEOJSON: CrimeGeoJSON = {
  type: "FeatureCollection",
  features: [],
  metadata: {
    count: 0,
    window_start: new Date().toISOString(),
    window_end: new Date().toISOString(),
    truncated: false,
  },
};

export async function fetchGeoJSON(
  filters: FilterState,
  limit = 1000
): Promise<CrimeGeoJSON> {
  const params = filtersToParams(filters);
  // The map layer has no free-text facet; search only narrows the feed.
  delete params.search;

  const data = await request<CrimeGeoJSON>("/api/v1/crimes/geojson", {
    ...params,
    days: filters.days,
    limit,
  });
  return data ?? EMPTY_GEOJSON;
}

export async function fetchIncident(id: string): Promise<CrimeIncident | null> {
  return request<CrimeIncident>(`/api/v1/crimes/${encodeURIComponent(id)}`);
}

export async function fetchThanas(): Promise<Thana[]> {
  const data = await request<Thana[]>("/api/v1/crimes/thanas");
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export const EMPTY_SUMMARY: CrimeAnalyticsSummary = {
  total_30d: 0,
  total_7d: 0,
  total_previous_7d: 0,
  change_7d_pct: 0,
  top_category: null,
  top_category_count: 0,
  highest_risk_thana: null,
  highest_risk_thana_count: 0,
  verified_source_count: 0,
  verified_source_ratio: 0,
  total_all_time: 0,
  last_ingest_at: null,
  window_days: 30,
};

export async function fetchSummary(days = 30): Promise<CrimeAnalyticsSummary> {
  const data = await request<CrimeAnalyticsSummary>(
    "/api/v1/analytics/summary",
    { days }
  );
  return data ?? { ...EMPTY_SUMMARY, window_days: days };
}

export async function fetchTrends(
  days = 30,
  category?: string | null,
  thana?: string | null
): Promise<TrendsResponse> {
  const data = await request<TrendsResponse>("/api/v1/analytics/trends", {
    days,
    category: category ?? null,
    thana: thana ?? null,
  });

  if (data) return data;

  // Synthesise a flat zero series so the axis still renders with the right
  // date range instead of collapsing to an empty box.
  const points = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (days - 1 - index));
    return { date: date.toISOString().slice(0, 10), count: 0 };
  });

  return { points, window_days: days, total: 0, daily_average: 0 };
}

export async function fetchCategories(
  days = 30,
  thana?: string | null
): Promise<CategoriesResponse> {
  const data = await request<CategoriesResponse>(
    "/api/v1/analytics/categories",
    { days, thana: thana ?? null }
  );
  return data ?? { categories: [], window_days: days, total: 0 };
}

export async function fetchThanaRanking(
  days = 30,
  limit = 15
): Promise<ThanaRankingResponse> {
  const data = await request<ThanaRankingResponse>("/api/v1/analytics/thanas", {
    days,
    limit,
  });
  return data ?? { thanas: [], window_days: days };
}

export async function fetchSourceMix(days = 30): Promise<SourceMixResponse> {
  const data = await request<SourceMixResponse>("/api/v1/analytics/sources", {
    days,
  });
  return data ?? { window_days: days, total: 0, sources: [] };
}

export async function fetchHourly(days = 30): Promise<HourlyResponse> {
  const data = await request<HourlyResponse>("/api/v1/analytics/hourly", {
    days,
  });
  return (
    data ?? {
      window_days: days,
      hours: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
    }
  );
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export async function fetchHealth(): Promise<{
  status: string;
  database: string;
} | null> {
  return request<{ status: string; database: string }>("/health");
}
