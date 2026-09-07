"use client";

import { CircleMarker, Popup, Tooltip } from "react-leaflet";

import type { CrimeFeature } from "@/types/crime";
import {
  categoryColor,
  cn,
  formatDateTimeBST,
  hostnameOf,
  relativeTime,
  severityRadius,
  truncate,
  TRUST_CLASS,
  TRUST_DOT,
  TRUST_LABEL,
  trustTier,
} from "@/lib/utils";

interface MapMarkerProps {
  feature: CrimeFeature;
  /** Called when the marker is clicked, so the feed can scroll to the card. */
  onSelect?: (id: string) => void;
}

/**
 * A single incident pin.
 *
 * `CircleMarker` rather than the default `Marker` on purpose: Leaflet's marker
 * icon is a bundled PNG whose path breaks under Next's asset pipeline, and a
 * vector circle also lets severity drive both colour and radius without
 * shipping nine icon variants.
 */
export default function MapMarker({ feature, onSelect }: MapMarkerProps) {
  const { properties, geometry } = feature;
  const [longitude, latitude] = geometry.coordinates;

  const color = categoryColor(properties.crime_category);
  const tier = trustTier(properties.source_platform);

  return (
    <CircleMarker
      center={[latitude, longitude]}
      radius={severityRadius(properties.crime_category)}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.55,
        weight: 2,
        opacity: 0.9,
      }}
      eventHandlers={{
        click: () => onSelect?.(properties.id),
      }}
    >
      {/* Hover label - lets a reader scan the map without opening popups. */}
      <Tooltip direction="top" offset={[0, -6]} opacity={1}>
        <span className="font-mono text-[10px] uppercase tracking-wider">
          {properties.crime_category} · {properties.thana_name}
        </span>
      </Tooltip>

      <Popup autoPan closeButton>
        <div className="p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              className="chip"
              style={{
                color,
                borderColor: `${color}66`,
                backgroundColor: `${color}1a`,
              }}
            >
              {properties.crime_category}
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              {relativeTime(properties.incident_date)}
            </span>
          </div>

          <h3 className="mb-1.5 text-sm font-semibold leading-snug text-zinc-100">
            {properties.title}
          </h3>

          <p className="mb-3 text-xs leading-relaxed text-zinc-400">
            {truncate(properties.narrative, 180)}
          </p>

          <dl className="mb-3 space-y-1 border-t border-surface-border/70 pt-2 font-mono text-[10px] text-zinc-500">
            <div className="flex justify-between gap-3">
              <dt>Thana</dt>
              <dd className="text-zinc-300">
                {properties.thana_name}, {properties.district}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Reported</dt>
              <dd className="text-zinc-300">
                {formatDateTimeBST(properties.incident_date)}
              </dd>
            </div>
            {properties.fir_or_gd && (
              <div className="flex justify-between gap-3">
                <dt>FIR / GD</dt>
                <dd className="text-zinc-300">{properties.fir_or_gd}</dd>
              </div>
            )}
            {properties.penal_code_tags.length > 0 && (
              <div className="flex justify-between gap-3">
                <dt>Statutes</dt>
                <dd className="text-right text-zinc-300">
                  {properties.penal_code_tags.join(", ")}
                </dd>
              </div>
            )}
          </dl>

          <div className="flex items-center justify-between gap-2">
            <span className={cn("chip", TRUST_CLASS[tier])}>
              <span aria-hidden>{TRUST_DOT[tier]}</span>
              {TRUST_LABEL[tier]} · {properties.source_confidence}
            </span>

            <a
              href={properties.source_url}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-[10px] text-accent-soft underline underline-offset-2 hover:text-accent"
            >
              {hostnameOf(properties.source_url)} ↗
            </a>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}
