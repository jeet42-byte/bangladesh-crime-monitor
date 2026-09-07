"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Crosshair,
  Database,
  FileText,
  Lock,
  LogIn,
  UserPlus,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

/**
 * Gates a section behind a signed-in account.
 *
 * This is a product gate, not an access control. The underlying API is public
 * by design - the footer advertises it and the methodology page documents it -
 * so anyone can still read the same data by calling the endpoints directly.
 * The gate shapes what the site offers a casual visitor; it does not, and is
 * not intended to, keep the data secret.
 *
 * It renders in place rather than redirecting, so the URL survives a sign-in
 * and a shared link still lands where it was pointed.
 */

const SECTION_COPY: Record<
  string,
  { title: string; icon: typeof BarChart3; blurb: string }
> = {
  "/analytics": {
    title: "Analytics",
    icon: BarChart3,
    blurb:
      "Trends over time, category breakdowns, thana rankings and the source composition of the archive.",
  },
  "/database": {
    title: "Record Archive",
    icon: Database,
    blurb:
      "Every stored record, searchable and filterable, with CSV export and a link back to each original source.",
  },
  "/ttp": {
    title: "TTP & Risk Treatment",
    icon: Crosshair,
    blurb:
      "How fraud, trafficking and homicide actually unfold, stage by stage, with the controls available to a citizen and to an investigator at each one.",
  },
  "/exposure": {
    title: "Site Exposure",
    icon: Building2,
    blurb:
      "Reported activity near a named commercial site, the threat patterns that apply to that class of asset, and how much collection stands behind the answer.",
  },
  "/methodology": {
    title: "Methodology",
    icon: FileText,
    blurb:
      "How records are collected, verified and scored, plus the limitations of what this dataset can support.",
  },
};

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();

  // Do not flash the gate at someone whose token is still being resolved.
  if (status === "loading") {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="skeleton h-52 w-full rounded-xl" />
      </div>
    );
  }

  if (status === "authenticated") {
    return <>{children}</>;
  }

  const section = SECTION_COPY[pathname] ?? {
    title: "This section",
    icon: Lock,
    blurb: "This part of the portal is available to signed-in accounts.",
  };
  const Icon = section.icon;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-lg flex-col justify-center px-4 py-12">
      <section className="panel p-7 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-surface-border bg-surface-overlay">
          <Icon className="h-5 w-5 text-accent-soft" aria-hidden />
        </span>

        <p className="label-mono mb-2">Account required</p>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
          {section.title}
        </h1>
        <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-zinc-400">
          {section.blurb}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link href="/login" className="btn btn-accent">
            <LogIn className="h-4 w-4" aria-hidden />
            Sign in
          </Link>
          <Link href="/login" className="btn">
            <UserPlus className="h-4 w-4" aria-hidden />
            Create an account
          </Link>
        </div>

        <p className="mt-5 border-t border-surface-border/60 pt-4 text-xs leading-relaxed text-zinc-500">
          {status === "guest"
            ? "You are browsing as a guest. The live map and incident feed on the Command Center stay open to guests."
            : "The live map and incident feed on the Command Center are open to everyone."}{" "}
          <Link href="/" className="text-accent-soft hover:text-accent">
            Return to the Command Center
          </Link>
          .
        </p>

        <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
          Signing up needs an email address and a one-time code. To report an
          inaccurate record or request removal of one that identifies you, no
          account is needed — use the corrections link in the footer.
        </p>
      </section>
    </div>
  );
}
