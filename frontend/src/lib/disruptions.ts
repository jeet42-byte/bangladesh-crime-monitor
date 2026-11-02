/** Live disruptions: blockades, hartals, rallies, clashes, closures. */

import { request } from "@/lib/api";

export type DisruptionKind = "road_blockade" | "hartal_strike" | "protest_rally" | "clash" | "road_closure";

export interface Disruption {
  id: string;
  kind: DisruptionKind;
  status: "ongoing" | "planned";
  title: string;
  place: string;
  district: string;
  lat: number;
  lon: number;
  starts_at: string;
  expires_at: string;
  sources: Array<{ outlet: string; url: string; title: string }>;
  updated_at: string;
}

export const KIND_LABEL: Record<DisruptionKind, string> = {
  road_blockade: "Road blockade",
  hartal_strike: "Hartal / strike",
  protest_rally: "Rally / procession",
  clash: "Clashes",
  road_closure: "Road closed / diverted",
};

export const KIND_COLOR: Record<DisruptionKind, string> = {
  road_blockade: "#f97316",
  hartal_strike: "#e11d48",
  protest_rally: "#eab308",
  clash: "#dc2626",
  road_closure: "#06b6d4",
};

export async function fetchActiveDisruptions(): Promise<Disruption[] | null> {
  return request<Disruption[]>("/api/v1/disruptions/active");
}

/** "now", "in 3 h", "tomorrow 06:00" for planned ones. */
export function whenLabel(d: Disruption, now: Date = new Date()): string {
  const start = new Date(d.starts_at);
  const end = new Date(d.expires_at);
  const hours = (ms: number) => Math.max(1, Math.round(ms / 3_600_000));
  if (start > now) return `starts in ${hours(start.getTime() - now.getTime())} h`;
  return `reported ${hours(now.getTime() - start.getTime())} h ago · may last ~${hours(end.getTime() - now.getTime())} h more`;
}
