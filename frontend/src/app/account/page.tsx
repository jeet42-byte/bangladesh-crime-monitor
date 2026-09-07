"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import RequireAuth from "@/components/auth/RequireAuth";
import { useAuth } from "@/components/auth/AuthProvider";
import { changePassword } from "@/lib/auth";
import { passwordProblem, MIN_PASSWORD_LENGTH } from "@/lib/password";
import { formatDateTimeBST } from "@/lib/utils";

function AccountPage() {
  const { user } = useAuth();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      setDone(null);

      if (next !== confirm) {
        setError("The two new passwords do not match.");
        return;
      }

      const problem = passwordProblem(next, user?.email ?? "", user?.username ?? "");
      if (problem) {
        setError(problem);
        return;
      }

      setBusy(true);
      const { data, error: failure } = await changePassword(current, next);
      if (failure) {
        setError(failure.message);
      } else {
        setDone(data?.message ?? "Password updated.");
        setCurrent("");
        setNext("");
        setConfirm("");
      }
      setBusy(false);
    },
    [current, next, confirm, user]
  );

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <header className="mb-7">
        <p className="label-mono">Account</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">
          {user.display_name || user.username}
        </h1>
        <p className="mt-1 font-mono text-xs text-zinc-500">{user.email}</p>
      </header>

      <section className="panel mb-5 p-5">
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Username</dt>
            <dd className="font-mono text-zinc-300">{user.username}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Role</dt>
            <dd className="flex items-center gap-1.5 text-zinc-300">
              {user.role === "owner" && (
                <ShieldCheck className="h-3.5 w-3.5 text-accent-soft" aria-hidden />
              )}
              {user.role === "owner" ? "Owner" : "Member"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Member since</dt>
            <dd className="text-zinc-300">
              {formatDateTimeBST(user.created_at)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="panel p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <KeyRound className="h-4 w-4 text-accent-soft" aria-hidden />
          Change password
        </h2>
        <p className="mb-4 text-xs leading-relaxed text-zinc-500">
          Your current password is required, so a stolen session alone cannot
          lock you out of your own account.
        </p>

        {done && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-emerald-200">{done}</p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-severity-critical/40 bg-severity-critical/10 p-3"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-severity-critical"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label htmlFor="current" className="label-mono mb-1.5 block">
              Current password
            </label>
            <input
              id="current"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="next" className="label-mono mb-1.5 block">
              New password
            </label>
            <div className="relative">
              <input
                id="next"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="field pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide passwords" : "Show passwords"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {show ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="label-mono mb-1.5 block">
              Confirm new password
            </label>
            <input
              id="confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="field"
            />
          </div>

          <button type="submit" disabled={busy} className="btn btn-accent w-full">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden />
            )}
            Update password
          </button>
        </form>
      </section>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-600">
        There is no self-service password reset yet — it needs an email
        provider configured. Until then a forgotten password has to be reset
        directly in the database.{" "}
        <Link href="/" className="text-zinc-500 hover:text-zinc-300">
          Back to the Command Center
        </Link>
        .
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <AccountPage />
    </RequireAuth>
  );
}
