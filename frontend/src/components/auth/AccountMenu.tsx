"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";

/** Account state in the header: sign-in link, or the signed-in user's menu. */
export default function AccountMenu() {
  const { status, user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Render nothing until the token has been resolved, rather than flashing
  // "Sign in" at someone who is already signed in.
  if (status === "loading") {
    return <span className="skeleton h-8 w-20 rounded-lg" aria-hidden />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <Link
        href="/login"
        className="btn px-2.5 py-1.5 text-xs"
        title={status === "guest" ? "Browsing as a guest" : "Sign in"}
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">
          {status === "guest" ? "Guest" : "Sign in"}
        </span>
      </Link>
    );
  }

  const isOwner = user.role === "owner";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="btn px-2.5 py-1.5 text-xs"
      >
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold",
            isOwner
              ? "bg-accent/25 text-accent-soft"
              : "bg-surface-border text-zinc-300"
          )}
          aria-hidden
        >
          {user.username.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">
          {user.username}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[1200] mt-2 w-60 overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-xl"
        >
          <div className="border-b border-surface-border/70 px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-100">
              {user.display_name || user.username}
              {isOwner && (
                <ShieldCheck
                  className="h-3.5 w-3.5 text-accent-soft"
                  aria-label="Site owner"
                />
              )}
            </p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
              {user.email}
            </p>
            <span
              className={cn(
                "chip mt-2",
                isOwner
                  ? "border-accent/40 bg-accent/10 text-accent-soft"
                  : "border-surface-border bg-surface-overlay/60 text-zinc-400"
              )}
            >
              <UserIcon className="h-3 w-3" aria-hidden />
              {isOwner ? "Owner" : "Member"}
            </span>
          </div>

          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 border-b border-surface-border/70 px-3.5 py-3 text-left text-sm text-zinc-300 transition-colors hover:bg-surface-overlay/60"
          >
            <KeyRound className="h-4 w-4" aria-hidden />
            Account &amp; password
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
              router.push("/login");
            }}
            className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-sm text-zinc-300 transition-colors hover:bg-surface-overlay/60"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
