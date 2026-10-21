"use client";

import { useEffect, useMemo, useState } from "react";
import { Rectangle, Tooltip, useMap, useMapEvents } from "react-leaflet";

import type { CrimeGeoJSON } from "@/types/crime";

/**
 * Binned density layer: incidents counted into square lat/lon cells and each
 * cell filled on a "hot" ramp (dark red -> red -> orange -> yellow -> white).
 *
 * Binning rather than a blurred kernel heat map, deliberately. Outside Dhaka
 * every record sits on a district centroid, so a blur would paint a smooth
 * gradient of precision the data does not have; a square cell says "this many
 * reports fell somewhere in here" and no more.
 */

// Stops of the ramp, sampled at t in [0, 1]. Close to matplotlib's "hot",
// starting at a visible dark red so a one-report cell still reads on the
// dark basemap.
const RAMP: ReadonlyArray<readonly [number, [number, number, number]]> = [
  [0.0, [90, 0, 0]],
  [0.3, [200, 0, 0]],
  [0.55, [255, 70, 0]],
  [0.75, [255, 170, 0]],
  [0.9, [255, 240, 40]],
  [1.0, [255, 255, 230]],
];

export function heatColor(t: number): string {
  const x = Math.min(Math.max(t, 0), 1);
  for (let i = 1; i < RAMP.length; i += 1) {
    const [t1, c1] = RAMP[i];
    const [t0, c0] = RAMP[i - 1];
    if (x <= t1) {
      const f = (x - t0) / (t1 - t0 || 1);
      const mix = c0.map((v, k) => Math.round(v + (c1[k] - v) * f));
      return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
    }
  }
  const [, last] = RAMP[RAMP.length - 1];
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

export const HEAT_GRADIENT_CSS = `linear-gradient(to right, ${RAMP.map(
  ([t, [r, g, b]]) => `rgb(${r}, ${g}, ${b}) ${t * 100}%`
).join(", ")})`;

/** Cell edge in degrees for a zoom level: ~25 km at country view, ~1 km in a city. */
export function cellSizeFor(zoom: number): number {
  return Math.min(0.5, Math.max(0.005, 0.25 * 2 ** (7 - zoom)));
}

interface Cell {
  south: number;
  west: number;
  count: number;
  top: string;
}

export function binFeatures(data: CrimeGeoJSON, size: number): { cells: Cell[]; max: number } {
  const buckets = new Map<string, { south: number; west: number; count: number; cats: Map<string, number> }>();
  for (const feature of data.features) {
    const [lon, lat] = feature.geometry.coordinates;
    const row = Math.floor(lat / size);
    const col = Math.floor(lon / size);
    const key = `${row}:${col}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { south: row * size, west: col * size, count: 0, cats: new Map() };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    const cat = feature.properties.crime_category;
    bucket.cats.set(cat, (bucket.cats.get(cat) ?? 0) + 1);
  }

  let max = 0;
  const cells: Cell[] = [];
  buckets.forEach((bucket) => {
    max = Math.max(max, bucket.count);
    let top = "";
    let topCount = -1;
    bucket.cats.forEach((n, cat) => {
      if (n > topCount) {
        top = cat;
        topCount = n;
      }
    });
    cells.push({ south: bucket.south, west: bucket.west, count: bucket.count, top });
  });
  // Hottest last, so they paint over their neighbours' edges.
  cells.sort((a, b) => a.count - b.count);
  return { cells, max };
}

export default function HeatGrid({
  data,
  onScale,
}: {
  data: CrimeGeoJSON;
  /** Reports the busiest cell's count so the legend can label its scale. */
  onScale?: (max: number) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  // The map frames the data (fitBounds) right after mount, sometimes before
  // this listener exists; without the deferred re-read the grid stays sized
  // for the initial city zoom and its cells are sub-pixel at country view.
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    viewreset: () => setZoom(map.getZoom()),
  });
  useEffect(() => {
    const sync = () => setZoom(map.getZoom());
    sync();
    const timer = setTimeout(sync, 400);
    return () => clearTimeout(timer);
  }, [map, data]);

  const size = cellSizeFor(zoom);
  const { cells, max } = useMemo(() => binFeatures(data, size), [data, size]);

  // Log scale: one district with fifty reports would otherwise wash every
  // other cell down to the bottom of the ramp.
  const denom = Math.log1p(Math.max(max, 1));

  useEffect(() => {
    onScale?.(max);
  }, [max, onScale]);

  return (
    <>
      {cells.map((cell) => {
        const t = Math.log1p(cell.count) / denom;
        return (
          <Rectangle
            key={`${cell.south}:${cell.west}:${size}`}
            bounds={[
              [cell.south, cell.west],
              [cell.south + size, cell.west + size],
            ]}
            pathOptions={{
              stroke: false,
              fillColor: heatColor(t),
              fillOpacity: 0.55 + 0.35 * t,
            }}
            eventHandlers={{
              click: () =>
                map.setView(
                  [cell.south + size / 2, cell.west + size / 2],
                  Math.min(map.getZoom() + 2, 15)
                ),
            }}
          >
            <Tooltip direction="top" sticky>
              <span className="font-mono text-[11px]">
                {cell.count} incident{cell.count === 1 ? "" : "s"} · mostly {cell.top}
              </span>
            </Tooltip>
          </Rectangle>
        );
      })}
    </>
  );
}
