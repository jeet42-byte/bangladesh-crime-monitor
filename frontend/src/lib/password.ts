/**
 * Client-side password checks.
 *
 * These mirror `backend/app/core/security.py` so a user gets an answer before
 * a round trip. They are a convenience, never the enforcement: the server
 * repeats every one of them, because anything checked only in the browser is
 * not checked at all.
 */

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwertyuiop",
  "letmein123",
  "welcome123",
  "admin123",
  "iloveyou1",
  "bangladesh",
  "dhaka1234",
  "changeme1",
  "passw0rd",
  "qwerty1234",
  "abc12345",
  "111111111",
  "sunshine1",
  "football1",
]);

/** Returns a human-readable problem, or null when the password is acceptable. */
export function passwordProblem(
  password: string,
  email = "",
  username = ""
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "That password is too common. Choose something less predictable.";
  }
  if (new Set(password).size < 5) {
    return "Password must use at least five different characters.";
  }

  const localPart = email.includes("@") ? email.split("@")[0] : "";
  for (const personal of [localPart, username]) {
    const needle = personal.trim().toLowerCase();
    if (needle.length >= 4 && password.toLowerCase().includes(needle)) {
      return "Password must not contain your username or email address.";
    }
  }

  return null;
}
