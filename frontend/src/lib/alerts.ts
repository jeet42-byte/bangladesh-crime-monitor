/** Area alerts: Web Push subscription for the area chosen on My Area. */

import { request } from "@/lib/api";
import type { SavedArea } from "@/lib/area";

const STORAGE_KEY = "bcm.alertArea";

export type AlertSupport = "supported" | "needs-install" | "unsupported";

export function alertSupport(): AlertSupport {
  if (typeof window === "undefined") return "unsupported";
  const hasPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  // iOS only offers push to sites added to the Home Screen.
  if (ios && !standalone) return "needs-install";
  return hasPush ? "supported" : "unsupported";
}

function keyBytes(base64url: string): Uint8Array {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export function loadAlertArea(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function rememberAlertArea(label: string | null): void {
  try {
    if (label) window.localStorage.setItem(STORAGE_KEY, label);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the switch just will not remember its state.
  }
}

/** Ask permission, subscribe, and register the area. Returns an error message or null. */
export async function enableAlerts(area: SavedArea): Promise<string | null> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "Notifications were not allowed. You can allow them in the browser's site settings.";
  const keyResponse = await request<{ key: string }>("/api/v1/alerts/vapid-public-key");
  if (!keyResponse) return "Could not reach the server. Try again in a minute.";
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(keyResponse.key) as BufferSource,
    }));
  const json = subscription.toJSON();
  const saved = await request<{ subscribed: boolean }>("/api/v1/alerts/subscribe", {}, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      label: area.label,
      lat: area.lat,
      lon: area.lon,
      radius_km: area.radiusKm,
    }),
  });
  if (!saved?.subscribed) return "The server did not accept the subscription. Try again later.";
  rememberAlertArea(area.label);
  return null;
}

export async function disableAlerts(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await request("/api/v1/alerts/unsubscribe", {}, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  }
  rememberAlertArea(null);
}
