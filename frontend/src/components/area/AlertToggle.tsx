"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

import { alertSupport, disableAlerts, enableAlerts, loadAlertArea, type AlertSupport } from "@/lib/alerts";
import type { SavedArea } from "@/lib/area";

/** "Notify me" for the area on screen. One area per browser. */
export default function AlertToggle({ area }: { area: SavedArea }) {
  const [support, setSupport] = useState<AlertSupport>("unsupported");
  const [subscribed, setSubscribed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupport(alertSupport());
    setSubscribed(loadAlertArea());
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      const problem = await enableAlerts(area);
      if (problem) setError(problem);
      else setSubscribed(area.label);
    } catch {
      setError("This browser could not turn on notifications.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await disableAlerts();
    } finally {
      setSubscribed(null);
      setBusy(false);
    }
  };

  return (
    <section className="panel p-4" aria-label="Alerts">
      <p className="label-mono mb-2 flex items-center gap-1.5">
        <Bell className="h-3.5 w-3.5" aria-hidden /> Alerts for this area
      </p>
      {support === "unsupported" ? (
        <p className="text-xs text-zinc-500">This browser does not support notifications. Chrome on Android works best.</p>
      ) : support === "needs-install" ? (
        <p className="text-xs text-zinc-400">
          On iPhone, first add this site to your Home Screen (Share → Add to Home Screen), then open it from there
          to turn on alerts.
        </p>
      ) : subscribed === area.label ? (
        <>
          <p className="text-xs text-emerald-300">
            On: you will be notified about new reports within {area.radiusKm} km of {area.label}.
          </p>
          <button type="button" onClick={turnOff} disabled={busy} className="btn mt-3 w-full text-xs">
            <BellOff className="h-3.5 w-3.5" aria-hidden /> Turn off
          </button>
        </>
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            Get a phone notification when new reports come in near {area.label}, at most one every six hours. No
            account, name or email needed.
            {subscribed && ` This replaces your alerts for ${subscribed}.`}
          </p>
          <button type="button" onClick={turnOn} disabled={busy} className="btn btn-accent mt-3 w-full text-xs">
            <Bell className="h-3.5 w-3.5" aria-hidden /> {busy ? "Turning on…" : "Notify me"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-xs text-amber-300">{error}</p>}
    </section>
  );
}
