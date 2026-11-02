/** My Area: incidents reported near one place. */

import { request } from "@/lib/api";
import type { CrimeIncident } from "@/types/crime";

export interface Place {
  name: string;
  kind: "thana" | "upazila" | "district";
  district: string;
  lat: number;
  lon: number;
}

export interface AreaSummary {
  lat: number;
  lon: number;
  radius_km: number;
  window_days: number;
  total: number;
  previous_total: number;
  district_level: number;
  categories: Array<{ category: string; count: number; previous: number }>;
  weekly: Array<{ week_start: string; count: number }>;
  recent: CrimeIncident[];
}

/** A chosen area, remembered on this device only. */
export interface SavedArea {
  label: string;
  lat: number;
  lon: number;
  radiusKm: number;
}

export const PLACE_KIND_LABEL: Record<Place["kind"], string> = {
  thana: "Dhaka thana",
  upazila: "Upazila",
  district: "District",
};

/** Sensible default radius: a city thana is small, a district is not. */
export function defaultRadius(kind: Place["kind"] | "here"): number {
  return kind === "district" ? 25 : kind === "upazila" ? 10 : kind === "thana" ? 3 : 3;
}

export function placeLabel(place: Place): string {
  return place.kind === "district" ? `${place.name} district` : `${place.name}, ${place.district}`;
}

export async function fetchPlaces(): Promise<Place[]> {
  return (await request<Place[]>("/api/v1/area/places")) ?? [];
}

export async function fetchAreaSummary(area: SavedArea, days: number): Promise<AreaSummary | null> {
  return request<AreaSummary>("/api/v1/area/summary", {
    lat: area.lat.toFixed(5),
    lon: area.lon.toFixed(5),
    radius_km: area.radiusKm,
    days,
  });
}

const STORAGE_KEY = "bcm.myArea";

export function loadSavedArea(): SavedArea | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedArea) : null;
  } catch {
    return null;
  }
}

export function saveArea(area: SavedArea): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(area));
  } catch {
    // Private mode or storage blocked: the page still works, it just forgets.
  }
}
