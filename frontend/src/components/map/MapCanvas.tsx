"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Layers } from "lucide-react";

import MapMarker from "@/components/map/MapMarker";
import type { CrimeGeoJSON } from "@/types/crime";
import { cn, DHAKA_CENTER, SEVERITY_HEX } from "@/lib/utils";

// Leaflet's stylesheet must be loaded for panes, controls and popups to lay
// out at all. Importing it here - inside the only module that ever renders on
// the client - keeps it out of the server bundle.
import "leaflet/dist/leaflet.css";

/**
 * Basemaps.
 *
 * CARTO's Dark Matter tiles are no longer open — basemaps.cartocdn.com now
 * serves an "API KEY REQUIRED" placeholder to unauthenticated callers — so the
 * dark canvas comes from Esri's ArcGIS Online instead, which needs no key and
 * renders labels as a separate overlay layer.
 */
const TILE_LAYERS = {
  dark: {
    label: "Dark Canvas",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    // Esri splits place labels out of the base raster; without this overlay
    // the canvas has no toponyms at all.
    referenceUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 16,
  },
  streets: {
    label: "OSM Streets",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    referenceUrl: null,
    maxZoom: 19,
  },
} as const;

type TileKey = keyof typeof TILE_LAYERS;

export interface MapCanvasProps {
  data: CrimeGeoJSON;
  loading?: boolean;
  onSelectIncident?: (id: string) => void;
  className?: string;
}

/**
 * Keeps the Leaflet viewport in sync with the rendered feature set.
 *
 * Without this the map stays framed on Dhaka after a filter narrows results
 * to, say, Uttara - the pins are on screen but tiny and off-centre.
 */
function FitToFeatures({ data }: { data: CrimeGeoJSON }) {
  const map = useMap();

  useEffect(() => {
    if (data.features.length === 0) return;

    const latitudes = data.features.map((f) => f.geometry.coordinates[1]);
    const longitudes = data.features.map((f) => f.geometry.coordinates[0]);

    const bounds: [[number, number], [number, number]] = [
      [Math.min(...latitudes), Math.min(...longitudes)],
      [Math.max(...latitudes), Math.max(...longitudes)],
    ];

    // A single incident produces a degenerate box; leave the zoom alone and
    // just recentre so the map does not slam to maximum zoom.
    if (data.features.length === 1) {
      map.setView([latitudes[0], longitudes[0]], Math.max(map.getZoom(), 13));
      return;
    }

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [data, map]);

  return null;
}

/** Leaflet measures the container on mount; a hidden panel measures as 0×0. */
function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);

    // One deferred pass covers the initial layout, where the parent grid has
    // not settled by the time Leaflet first measures.
    const timer = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [map]);

  return null;
}

export default function MapCanvas({
  data,
  loading = false,
  onSelectIncident,
  className,
}: MapCanvasProps) {
  const [tile, setTile] = useState<TileKey>("dark");

  const legend = useMemo(
    () =>
      [
        { label: "Homicide", color: SEVERITY_HEX.critical },
        { label: "Robbery / Extortion", color: SEVERITY_HEX.high },
        { label: "Assault / Narcotics", color: SEVERITY_HEX.medium },
        { label: "Theft / Fraud / Cyber", color: SEVERITY_HEX.low },
      ] as const,
    []
  );

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <MapContainer
        center={DHAKA_CENTER}
        zoom={12}
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom
        preferCanvas
        className="h-full w-full"
        // Roughly the land border of Bangladesh; stops a stray drag from
        // stranding the reader in the Bay of Bengal.
        maxBounds={[
          [20.3, 87.8],
          [26.9, 92.9],
        ]}
        maxBoundsViscosity={0.7}
      >
        <TileLayer
          key={tile}
          url={TILE_LAYERS[tile].url}
          attribution={TILE_LAYERS[tile].attribution}
          maxZoom={19}
          // Esri's canvas stops at z16; keep serving its last level rather
          // than dropping to blank tiles when the reader zooms past it.
          maxNativeZoom={TILE_LAYERS[tile].maxZoom}
        />

        {TILE_LAYERS[tile].referenceUrl && (
          <TileLayer
            key={`${tile}-labels`}
            url={TILE_LAYERS[tile].referenceUrl as string}
            maxZoom={19}
            maxNativeZoom={TILE_LAYERS[tile].maxZoom}
          />
        )}

        <InvalidateOnResize />
        <FitToFeatures data={data} />

        {data.features.map((feature) => (
          <MapMarker
            key={feature.properties.id}
            feature={feature}
            onSelect={onSelectIncident}
          />
        ))}
      </MapContainer>

      {/* Basemap switch */}
      <div className="pointer-events-auto absolute right-3 top-3 z-[1000]">
        <button
          type="button"
          onClick={() => setTile(tile === "dark" ? "streets" : "dark")}
          className="btn px-2.5 py-1.5 text-xs shadow-lg"
          title="Switch basemap"
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          {TILE_LAYERS[tile].label}
        </button>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-6 left-3 z-[1000] rounded-lg border border-surface-border/70 bg-surface/90 px-3 py-2.5 backdrop-blur-sm">
        <p className="label-mono mb-2">Severity</p>
        <ul className="space-y-1.5">
          {legend.map((entry) => (
            <li key={entry.label} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              <span className="text-[11px] text-zinc-400">{entry.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Feature count / truncation notice */}
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-lg border border-surface-border/70 bg-surface/90 px-3 py-1.5 backdrop-blur-sm">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          {loading
            ? "Loading incidents…"
            : `${data.metadata.count} incident${data.metadata.count === 1 ? "" : "s"} plotted`}
        </span>
        {data.metadata.truncated && (
          <span className="ml-2 font-mono text-[10px] text-amber-500">
            (capped — narrow the filters)
          </span>
        )}
      </div>

      {loading && (
        <div className="pointer-events-none absolute inset-0 z-[900] bg-surface/40 backdrop-blur-[1px]" />
      )}

      {!loading && data.features.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center">
          <div className="pointer-events-auto rounded-xl border border-surface-border bg-surface-raised/95 px-6 py-5 text-center">
            <p className="text-sm font-medium text-zinc-200">
              No incidents in this window
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Widen the date range or clear a filter.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
