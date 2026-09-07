"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { AuthStatus, AuthUser } from "@/types/auth";
import {
  clearGuest,
  clearToken,
  fetchMe,
  getToken,
  isGuest,
  setGuest as persistGuest,
  setToken,
} from "@/lib/auth";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Called after a successful login or verification. */
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => void;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  // Resolve the stored token on mount. This runs client-side only: reading
  // localStorage during SSR is impossible and rendering a signed-in shell on
  // the server would guarantee a hydration mismatch.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!getToken()) {
        if (!cancelled) setStatus(isGuest() ? "guest" : "anon");
        return;
      }

      const resolved = await fetchMe();
      if (cancelled) return;

      if (resolved) {
        setUser(resolved);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus(isGuest() ? "guest" : "anon");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((token: string, nextUser: AuthUser) => {
    setToken(token);
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    clearGuest();
    setUser(null);
    setStatus("anon");
  }, []);

  const continueAsGuest = useCallback(() => {
    persistGuest();
    setStatus("guest");
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signOut, continueAsGuest }),
    [status, user, signIn, signOut, continueAsGuest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
