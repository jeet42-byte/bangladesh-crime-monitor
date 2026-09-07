"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import CrimeMap from "@/components/map/CrimeMap";
import FilterBar from "@/components/dashboard/FilterBar";
import IncidentFeed from "@/components/dashboard/IncidentFeed";
import MetricCards from "@/components/dashboard/MetricCards";
import {
  EMPTY_GEOJSON,
  EMPTY_SUMMARY,
  fetchFeed,
  fetchGeoJSON,
  fetchSummary,
  fetchThanas,
} from "@/lib/api";
import {
  DEFAULT_FILTERS,
  type CrimeAnalyticsSummary,
  type CrimeGeoJSON,
  type CrimeIncident,
  type FilterState,
  type Thana,
} from "@/types/crime";

const PAGE_SIZE = 40;

export default function CommandCenterPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [thanas, setThanas] = useState<Thana[]>([]);

  const [summary, setSummary] = useState<CrimeAnalyticsSummary>(EMPTY_SUMMARY);
  const [geojson, setGeojson] = useState<CrimeGeoJSON>(EMPTY_GEOJSON);
  const [incidents, setIncidents] = useState<CrimeIncident[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Guards against a slow response from an earlier filter state overwriting a
  // newer one - a real hazard when the backend is cold-starting.
  const requestSeq = useRef(0);

  // Reference data changes about once a year; fetch it once.
  useEffect(() => {
    void fetchThanas().then(setThanas);
  }, []);

  useEffect(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setSelectedId(null);

    void (async () => {
      const [summaryData, geoData, feedData] = await Promise.all([
        fetchSummary(filters.days),
        fetchGeoJSON(filters),
        fetchFeed(filters, PAGE_SIZE, 0),
      ]);

      if (seq !== requestSeq.current) return; // superseded

      setSummary(summaryData);
      setGeojson(geoData);
      setIncidents(feedData.items);
      setTotal(feedData.total);
      setHasMore(feedData.has_more);
      setLoading(false);
    })();
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const seq = requestSeq.current;
    const next = await fetchFeed(filters, PAGE_SIZE, incidents.length);

    if (seq === requestSeq.current) {
      setIncidents((current) => [...current, ...next.items]);
      setTotal(next.total);
      setHasMore(next.has_more);
    }
    setLoadingMore(false);
  }, [filters, hasMore, incidents.length, loadingMore]);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 sm:px-6">
      <MetricCards summary={summary} loading={loading} />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        thanas={thanas}
        resultCount={total}
      />

      {/*
        Desktop: map 60% / feed 40% in a fixed-height row so the feed scrolls
        inside its own pane rather than pushing the map off-screen.
        Mobile: stacked, with the map given a definite height because Leaflet
        cannot measure a flex child that has none.
      */}
      <div className="grid min-h-0 grid-cols-1 gap-3 lg:h-[calc(100vh-19rem)] lg:min-h-[560px] lg:grid-cols-[3fr_2fr]">
        <div className="panel h-[420px] overflow-hidden sm:h-[520px] lg:h-auto">
          <CrimeMap
            data={geojson}
            loading={loading}
            onSelectIncident={setSelectedId}
          />
        </div>

        <IncidentFeed
          incidents={incidents}
          loading={loading}
          total={total}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
          selectedId={selectedId}
          onSelect={setSelectedId}
          className="h-[520px] lg:h-auto"
        />
      </div>

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-zinc-600">
        Incidents are compiled automatically from public reporting and describe
        allegations as reported, not adjudicated findings. Locations are placed
        at the centroid of the responsible police thana, not the exact scene.
      </p>
    </div>
  );
}
