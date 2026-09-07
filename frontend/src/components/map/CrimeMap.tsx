"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

import type { MapCanvasProps } from "@/components/map/MapCanvas";

/**
 * SSR-safe entry point for the map.
 *
 * Leaflet reads `window` at module scope, so it cannot be evaluated during
 * server rendering. This wrapper is the only thing the rest of the app
 * imports; the actual Leaflet tree lives in `MapCanvas` and is loaded client
 * side with `ssr: false`.
 */
const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-raised/40">
      <div className="flex flex-col items-center gap-3">
        <span className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/30" />
          <MapPin className="relative h-5 w-5 text-accent-soft" aria-hidden />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Initialising geospatial layer
        </p>
      </div>
    </div>
  );
}

export default function CrimeMap(props: MapCanvasProps) {
  return <MapCanvas {...props} />;
}
