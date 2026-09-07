"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  Crosshair,
  Database,
  FileText,
  Lock,
  Menu,
  Radar,
  X,
} from "lucide-react";

import AccountMenu from "@/components/auth/AccountMenu";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchHealth } from "@/lib/api";
import { cn, currentBSTClock } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Command Center", icon: Radar, gated: false },
  { href: "/analytics", label: "Analytics", icon: BarChart3, gated: true },
  { href: "/database", label: "Archive", icon: Database, gated: true },
  { href: "/ttp", label: "TTP & Treatment", icon: Crosshair, gated: true },
  { href: "/exposure", label: "Site Exposure", icon: Building2, gated: true },
  { href: "/methodology", label: "Methodology", icon: FileText, gated: true },
] as const;

type StreamState = "checking" | "live" | "degraded";

export default function Navbar() {
  const pathname = usePathname();
  const { status } = useAuth();
  // Signed-out visitors see which sections need an account before clicking,
  // rather than discovering it on arrival.
  const locked = status !== "authenticated" && status !== "loading";
  const [clock, setClock] = useState<string>("--:--:--");
  const [stream, setStream] = useState<StreamState>("checking");
  const [menuOpen, setMenuOpen] = useState(false);

  // The clock starts on the client only. Rendering a real time on the server
  // would guarantee a hydration mismatch, since the two run seconds apart.
  useEffect(() => {
    setClock(currentBSTClock());
    const timer = setInterval(() => setClock(currentBSTClock()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Heartbeat: re-probed every two minutes so a sleeping backend surfaces in
  // the header rather than as silently stale data.
  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      const health = await fetchHealth();
      if (cancelled) return;
      setStream(health?.status === "ok" ? "live" : "degraded");
    };

    void probe();
    const timer = setInterval(probe, 120_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const streamLabel =
    stream === "live"
      ? "Live OSINT Stream Active"
      : stream === "degraded"
        ? "Stream Degraded — Cached Data"
        : "Connecting…";

  const streamColor =
    stream === "live"
      ? "bg-emerald-500"
      : stream === "degraded"
        ? "bg-amber-500"
        : "bg-zinc-500";

  return (
    <header className="sticky top-0 z-[1100] border-b border-surface-border/70 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
            <Radar className="h-4 w-4 text-accent-soft" aria-hidden />
            <span className="absolute inset-0 rounded-lg border border-accent/40 animate-pulse-ring" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-zinc-100">
              Bangladesh Crime Monitor
            </span>
            <span className="label-mono block">OSINT Intelligence Portal</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map(({ href, label, icon: Icon, gated }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            const needsAccount = gated && locked;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={needsAccount ? `${label} requires an account` : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-surface-overlay text-zinc-100"
                    : needsAccount
                      ? "text-zinc-500 hover:bg-surface-overlay/60 hover:text-zinc-300"
                      : "text-zinc-400 hover:bg-surface-overlay/60 hover:text-zinc-200"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                {needsAccount && (
                  <Lock className="h-3 w-3 text-zinc-600" aria-label="Account required" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Heartbeat */}
          <div className="hidden items-center gap-2 rounded-lg border border-surface-border/70 bg-surface-raised/60 px-3 py-1.5 md:flex">
            <span className="relative flex h-2 w-2">
              {stream === "live" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              )}
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  streamColor
                )}
              />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
              {streamLabel}
            </span>
          </div>

          {/* BST clock */}
          <div className="flex items-center gap-2 rounded-lg border border-surface-border/70 bg-surface-raised/60 px-3 py-1.5">
            <Activity className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
            <span
              className="font-mono text-xs tabular-nums text-zinc-300"
              suppressHydrationWarning
            >
              {clock}
            </span>
            <span className="font-mono text-[10px] text-zinc-500">BST</span>
          </div>

          <AccountMenu />

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg border border-surface-border p-2 text-zinc-300 lg:hidden"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <Menu className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="border-t border-surface-border/70 bg-surface px-4 py-2 lg:hidden">
          {NAV_ITEMS.map(({ href, label, icon: Icon, gated }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            const needsAccount = gated && locked;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm",
                  active
                    ? "bg-surface-overlay text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                {needsAccount && (
                  <Lock className="ml-auto h-3 w-3 text-zinc-600" aria-label="Account required" />
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
