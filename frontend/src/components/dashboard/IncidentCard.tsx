"use client";

import { forwardRef, useState } from "react";
import { ChevronDown, Clock, ExternalLink, MapPin, Scale } from "lucide-react";

import type { CrimeIncident } from "@/types/crime";
import {
  categoryColor,
  cn,
  formatDateTimeBST,
  hostnameOf,
  relativeTime,
  SEVERITY_BAR_CLASS,
  severityOf,
  truncate,
  TRUST_CLASS,
  TRUST_DOT,
  TRUST_LABEL,
  trustTier,
} from "@/lib/utils";

interface IncidentCardProps {
  incident: CrimeIncident;
  /** Highlighted when the matching map marker is clicked. */
  selected?: boolean;
  onSelect?: (id: string) => void;
}

const IncidentCard = forwardRef<HTMLElement, IncidentCardProps>(
  function IncidentCard({ incident, selected = false, onSelect }, ref) {
    const [expanded, setExpanded] = useState(false);

    const severity = severityOf(incident.crime_category);
    const tier = trustTier(incident.source_platform);
    const color = categoryColor(incident.crime_category);

    const isLong = incident.narrative.length > 220;

    return (
      <article
        ref={ref}
        onClick={() => onSelect?.(incident.id)}
        className={cn(
          "group relative flex animate-fade-up gap-0 overflow-hidden rounded-lg border bg-surface-raised/70 transition-colors",
          selected
            ? "border-accent/60 bg-surface-overlay/60"
            : "border-surface-border/60 hover:border-surface-border"
        )}
      >
        {/* Severity rule */}
        <span
          className={cn("w-1 shrink-0", SEVERITY_BAR_CLASS[severity])}
          aria-hidden
        />

        <div className="min-w-0 flex-1 p-3.5">
          {/* Header */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="chip"
              style={{
                color,
                borderColor: `${color}66`,
                backgroundColor: `${color}1a`,
              }}
            >
              {incident.crime_category}
            </span>

            <span className={cn("chip", TRUST_CLASS[tier])}>
              <span aria-hidden>{TRUST_DOT[tier]}</span>
              {TRUST_LABEL[tier]}
            </span>

            <span
              className="ml-auto flex items-center gap-1 font-mono text-[10px] text-zinc-500"
              title={formatDateTimeBST(incident.incident_date)}
            >
              <Clock className="h-3 w-3" aria-hidden />
              {relativeTime(incident.incident_date)}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold leading-snug text-zinc-100">
            {incident.title}
          </h3>

          {/* Narrative */}
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            {expanded ? incident.narrative : truncate(incident.narrative, 220)}
          </p>

          {isLong && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setExpanded((open) => !open);
              }}
              className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
            >
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  expanded && "rotate-180"
                )}
                aria-hidden
              />
              {expanded ? "Less" : "More"}
            </button>
          )}

          {/* Statutes */}
          {incident.penal_code_tags.length > 0 && (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {incident.penal_code_tags.map((tag) => (
                <li
                  key={tag}
                  className="chip border-surface-border bg-surface-overlay/60 text-zinc-400"
                >
                  <Scale className="h-3 w-3" aria-hidden />
                  {tag}
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-surface-border/50 pt-2.5">
            <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
              <MapPin className="h-3 w-3" aria-hidden />
              {incident.thana_name}, {incident.district}
            </span>

            {incident.fir_or_gd && (
              <span className="font-mono text-[10px] text-zinc-500">
                FIR/GD {incident.fir_or_gd}
              </span>
            )}

            <span className="font-mono text-[10px] text-zinc-600">
              confidence {incident.source_confidence}
            </span>

            <a
              href={incident.source_url}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(event) => event.stopPropagation()}
              className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-accent-soft hover:text-accent"
            >
              {hostnameOf(incident.source_url)}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>
        </div>
      </article>
    );
  }
);

export default IncidentCard;
