/** Auth domain types. Mirrors `backend/app/api/v1/auth.py`. */

export type UserRole = "owner" | "member";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  is_verified: boolean;
  display_name: string | null;
  credentials: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
  /** True only when the server logged the code instead of emailing it. */
  delivered_to_console: boolean;
}

export interface OwnerAttribution {
  display_name: string;
  credentials: string[];
  username: string | null;
}

/**
 * Three states, not two. "guest" is a deliberate choice the visitor made and
 * is remembered, so the login page is not shown again on every visit; "anon"
 * means they have not chosen yet.
 */
export type AuthStatus = "loading" | "authenticated" | "guest" | "anon";

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

/** Anything the API rejected, normalised to one shape for the forms. */
export interface AuthError {
  message: string;
  status: number | null;
}
