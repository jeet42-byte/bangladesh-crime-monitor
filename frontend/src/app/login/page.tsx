"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Mail,
  Radar,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { login, register, resendCode, verifyCode } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/lib/password";

type Mode = "signin" | "register" | "verify";

const OTP_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const { status, signIn, continueAsGuest } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [consoleDelivery, setConsoleDelivery] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Already signed in? Nothing to do here.
  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  // Resend cooldown, so the button cannot be hammered into the rate limit.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (mode === "verify") codeInputRef.current?.focus();
  }, [mode]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSignIn = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setBusy(true);
      setError(null);

      const { data, error: failure } = await login(identifier.trim(), password);

      if (failure) {
        setError(failure.message);
        // A 403 here means the account exists but was never verified, so send
        // them straight to the code step instead of a dead end.
        if (failure.status === 403 && /verify/i.test(failure.message)) {
          setEmail(identifier.includes("@") ? identifier.trim() : "");
          switchMode("verify");
          setNotice(
            "This account still needs verifying. Enter the code from your email, or request a new one."
          );
        }
        setBusy(false);
        return;
      }

      if (data) signIn(data.access_token, data.user);
      setBusy(false);
      router.replace("/");
    },
    [identifier, password, signIn, router]
  );

  const handleRegister = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);

      const problem = passwordProblem(password, email, username);
      if (problem) {
        setError(problem);
        return;
      }

      setBusy(true);
      const { data, error: failure } = await register(
        email.trim().toLowerCase(),
        username.trim(),
        password
      );

      if (failure) {
        // 409 means the address already has an account. Send them to sign in
        // rather than leaving them on a form that will keep failing.
        if (failure.status === 409) {
          switchMode("signin");
          setIdentifier(email.trim());
          setNotice(failure.message);
        } else {
          setError(failure.message);
        }
        setBusy(false);
        return;
      }

      // Deployments without a verified sending domain skip verification and
      // return a session directly; there is no code to ask for.
      if (data?.access_token && data.user) {
        signIn(data.access_token, data.user);
        setBusy(false);
        router.replace("/");
        return;
      }

      // No token and no verification step means nothing was sent. Showing a
      // code screen here would be a dead end, so stay put and say so.
      if (data?.verification_required === false) {
        setError(
          data.message ||
            "The account could not be created. Please try again shortly."
        );
        setBusy(false);
        return;
      }

      setConsoleDelivery(Boolean(data?.delivered_to_console));
      switchMode("verify");
      setNotice(data?.message ?? null);
      setCooldown(30);
      setBusy(false);
    },
    [email, username, password, signIn, router]
  );

  const handleVerify = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setBusy(true);
      setError(null);

      const { data, error: failure } = await verifyCode(
        email.trim().toLowerCase(),
        code.trim()
      );

      if (failure) {
        setError(failure.message);
        setCode("");
        setBusy(false);
        return;
      }

      if (data) signIn(data.access_token, data.user);
      setBusy(false);
      router.replace("/");
    },
    [email, code, signIn, router]
  );

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setBusy(true);
    setError(null);
    const { data, error: failure } = await resendCode(email.trim().toLowerCase());
    if (failure) setError(failure.message);
    else {
      setNotice(data?.message ?? "A new code has been sent.");
      setConsoleDelivery(Boolean(data?.delivered_to_console));
    }
    setCooldown(30);
    setBusy(false);
  }, [email, cooldown]);

  const handleGuest = () => {
    continueAsGuest();
    router.replace("/");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-4 py-10">
      {/* Brand */}
      <div className="mb-7 text-center">
        <span className="relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-accent/40 bg-accent/10">
          <Radar className="h-5 w-5 text-accent-soft" aria-hidden />
          <span className="absolute inset-0 rounded-xl border border-accent/40 animate-pulse-ring" />
        </span>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
          Bangladesh Crime Monitor
        </h1>
        <p className="label-mono mt-1">OSINT Intelligence Portal</p>
      </div>

      <section className="panel p-6">
        {/* Tabs */}
        {mode !== "verify" && (
          <div
            className="mb-5 grid grid-cols-2 overflow-hidden rounded-lg border border-surface-border"
            role="tablist"
          >
            {(["signin", "register"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                onClick={() => switchMode(tab)}
                className={cn(
                  "px-3 py-2.5 text-sm transition-colors",
                  mode === tab
                    ? "bg-surface-overlay text-zinc-100"
                    : "bg-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tab === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
        )}

        {mode === "verify" && (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden />
            Back to sign in
          </button>
        )}

        {/* Messages */}
        {notice && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-emerald-200">{notice}</p>
          </div>
        )}

        {consoleDelivery && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
              aria-hidden
            />
            <p className="text-xs leading-relaxed text-amber-200">
              No email provider is configured on this deployment, so the code
              was written to the server log rather than sent to your inbox.
            </p>
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

        {/* --- Sign in --- */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <div>
              <label htmlFor="identifier" className="label-mono mb-1.5 block">
                Username or email
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label-mono mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pr-10"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={busy} className="btn btn-accent w-full">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden />
              )}
              Sign in
            </button>
          </form>
        )}

        {/* --- Register --- */}
        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label htmlFor="email" className="label-mono mb-1.5 block">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="you@example.com"
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">
                Used to reach you about corrections to records.
              </p>
            </div>

            <div>
              <label htmlFor="username" className="label-mono mb-1.5 block">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_.\-]+"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="field"
                placeholder="analyst_01"
              />
              <p className="mt-1.5 text-[11px] text-zinc-600">
                3–32 characters: letters, numbers, dot, underscore or hyphen.
              </p>
            </div>

            <div>
              <label htmlFor="new-password" className="label-mono mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field pr-10"
                  placeholder="At least 10 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
                Length matters more than symbols. A few unrelated words beats
                one word with punctuation stuck on the end.
              </p>
            </div>

            <button type="submit" disabled={busy} className="btn btn-accent w-full">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden />
              )}
              Create account
            </button>
          </form>
        )}

        {/* --- Verify --- */}
        {mode === "verify" && (
          <form onSubmit={handleVerify} className="space-y-3.5">
            <div className="mb-1 flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent-soft" aria-hidden />
              <h2 className="text-sm font-semibold text-zinc-200">
                Check your email
              </h2>
            </div>

            {!email && (
              <div>
                <label htmlFor="verify-email" className="label-mono mb-1.5 block">
                  Email address
                </label>
                <input
                  id="verify-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  placeholder="you@example.com"
                />
              </div>
            )}

            {email && (
              <p className="text-xs leading-relaxed text-zinc-400">
                Enter the {OTP_LENGTH}-digit code sent to{" "}
                <span className="font-mono text-zinc-200">{email}</span>. It
                expires in 15 minutes.
              </p>
            )}

            <div>
              <label htmlFor="code" className="label-mono mb-1.5 block">
                Verification code
              </label>
              <input
                id="code"
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
                }
                className="field text-center font-mono text-2xl tracking-[0.4em]"
                placeholder="000000"
              />
            </div>

            <button
              type="submit"
              disabled={busy || code.length !== OTP_LENGTH}
              className="btn btn-accent w-full"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ShieldCheck className="h-4 w-4" aria-hidden />
              )}
              Verify and continue
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={busy || cooldown > 0 || !email}
              className="btn w-full text-xs"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </form>
        )}

        {/* Guest */}
        <div className="mt-6 border-t border-surface-border/70 pt-5">
          <button type="button" onClick={handleGuest} className="btn w-full">
            <Users className="h-4 w-4" aria-hidden />
            Continue as guest
          </button>
          <p className="mt-2.5 text-[11px] leading-relaxed text-zinc-600">
            Guests get the full archive, map and analytics — everything on this
            site is public. An account exists so the operator can reach you
            about corrections, and for features that are not built yet. No
            account is created and nothing is stored about you as a guest.
          </p>
        </div>
      </section>

      <p className="mt-5 px-1 text-center text-[11px] leading-relaxed text-zinc-600">
        By creating an account you accept that this archive reports{" "}
        <Link href="/methodology" className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300">
          allegations as published
        </Link>
        , not adjudicated findings. Your email is used only for verification
        and account notices.
      </p>
    </div>
  );
}
