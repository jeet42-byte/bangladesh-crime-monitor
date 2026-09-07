/**
 * Auth client and token storage.
 *
 * The session token is a JWT held in `localStorage` and sent as a Bearer
 * header. The alternative — an httpOnly cookie — is not readable by scripts
 * and so resists XSS, but the API and the site sit on different origins
 * (onrender.com and vercel.app), which would force `SameSite=None` and bring
 * CSRF back with it. Given that an account here grants no privileged access
 * to data that guests cannot already read, the Bearer approach is the better
 * trade. Revisit it if accounts ever gain real privileges.
 */

import type {
  AuthError,
  AuthUser,
  MessageResponse,
  OwnerAttribution,
  TokenResponse,
} from "@/types/auth";
import { API_BASE_URL } from "@/lib/api";

const TOKEN_KEY = "bcm.session";
const GUEST_KEY = "bcm.guest";
const GUEST_TOKEN_KEY = "bcm.guest_token";
const GUEST_EXPIRY_KEY = "bcm.guest_token_exp";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** Every accessor is guarded: storage throws in private modes and previews. */
function safeGet(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable; the session simply will not persist */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

export function getToken(): string | null {
  return safeGet(TOKEN_KEY);
}

export function setToken(token: string): void {
  safeSet(TOKEN_KEY, token);
  // Choosing to sign in supersedes an earlier "continue as guest".
  safeRemove(GUEST_KEY);
}

export function clearToken(): void {
  safeRemove(TOKEN_KEY);
}

export function isGuest(): boolean {
  return safeGet(GUEST_KEY) === "1";
}

export function setGuest(): void {
  safeSet(GUEST_KEY, "1");
}

export function clearGuest(): void {
  safeRemove(GUEST_KEY);
}

/** Authorization header for API calls, or an empty object when signed out. */
export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Guest sessions
//
// The read API is no longer open, so even an unauthenticated visitor needs a
// token to load the Command Center. One is minted on demand and cached until
// shortly before it expires.
// ---------------------------------------------------------------------------

let guestTokenInFlight: Promise<string | null> | null = null;

function cachedGuestToken(): string | null {
  const token = safeGet(GUEST_TOKEN_KEY);
  const expiry = Number(safeGet(GUEST_EXPIRY_KEY) ?? 0);
  // Refresh a minute early so a request cannot start with a live token and
  // arrive with an expired one.
  if (token && expiry > Date.now() + 60_000) return token;
  return null;
}

export async function getGuestToken(): Promise<string | null> {
  const cached = cachedGuestToken();
  if (cached) return cached;

  // Several components mount at once on first paint; without this they would
  // each mint a separate token and burn through the rate limit.
  if (guestTokenInFlight) return guestTokenInFlight;

  guestTokenInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/guest`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };
      safeSet(GUEST_TOKEN_KEY, data.access_token);
      safeSet(
        GUEST_EXPIRY_KEY,
        String(Date.now() + data.expires_in * 1000)
      );
      return data.access_token;
    } catch {
      return null;
    } finally {
      guestTokenInFlight = null;
    }
  })();

  return guestTokenInFlight;
}

export function clearGuestToken(): void {
  safeRemove(GUEST_TOKEN_KEY);
  safeRemove(GUEST_EXPIRY_KEY);
}

/**
 * Authorization header for read endpoints: the account token when signed in,
 * otherwise a guest token minted on demand.
 */
export async function readerHeader(): Promise<Record<string, string>> {
  const token = getToken();
  if (token) return { Authorization: `Bearer ${token}` };
  const guest = await getGuestToken();
  return guest ? { Authorization: `Bearer ${guest}` } : {};
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

const TIMEOUT_MS = 25_000;

async function post<T>(
  path: string,
  body: unknown
): Promise<{ data: T | null; error: AuthError | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeader(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      // FastAPI puts the human-readable reason in `detail`; validation errors
      // arrive as an array of per-field objects instead.
      const detail = payload?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail) && detail[0]?.msg
            ? String(detail[0].msg)
            : "Something went wrong. Please try again.";
      return { data: null, error: { message, status: response.status } };
    }

    return { data: payload as T, error: null };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return {
      data: null,
      error: {
        message: aborted
          ? "The server is taking too long to respond. It may be waking up — try again in a moment."
          : "Could not reach the server. Check your connection and try again.",
        status: null,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export function register(email: string, username: string, password: string) {
  return post<MessageResponse>("/api/v1/auth/register", {
    email,
    username,
    password,
  });
}

export function verifyCode(email: string, code: string) {
  return post<TokenResponse>("/api/v1/auth/verify", { email, code });
}

export function resendCode(email: string) {
  return post<MessageResponse>("/api/v1/auth/resend", { email });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return post<MessageResponse>("/api/v1/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export function login(identifier: string, password: string) {
  return post<TokenResponse>("/api/v1/auth/login", { identifier, password });
}

/** Resolve the stored token to a user, or null if it is absent or stale. */
export async function fetchMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: { Accept: "application/json", ...authHeader() },
    });
    if (!response.ok) {
      // 401 means expired, revoked, or signed with a rotated secret. Either
      // way the token is dead weight.
      if (response.status === 401) clearToken();
      return null;
    }
    return (await response.json()) as AuthUser;
  } catch {
    // A network failure is not proof the token is bad, so keep it.
    return null;
  }
}

export async function fetchOwner(): Promise<OwnerAttribution | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/owner`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return (await response.json()) as OwnerAttribution;
  } catch {
    return null;
  }
}
