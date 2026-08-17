export type AuthErrorField = "name" | "email" | "password" | "currentPassword" | "newPassword";

export type MappedAuthError = {
  message: string;
  // Which field(s) the error is actually about, so the form can mark only
  // that field invalid — not every field just because *something* failed.
  // Sign-in's "invalid email or password" deliberately marks both: telling
  // an attacker which one was wrong is a user-enumeration leak.
  fields: readonly AuthErrorField[];
};

// Better Auth's own error codes are stable identifiers, not UI copy — map
// the ones our forms can actually trigger to something a user should see.
// Anything unrecognized gets a safe, generic fallback rather than a raw
// Better Auth/database error (which could leak internals).
const ERRORS: Record<string, MappedAuthError> = {
  INVALID_EMAIL: { message: "Enter a valid email address.", fields: ["email"] },
  INVALID_EMAIL_OR_PASSWORD: {
    message: "Invalid email or password.",
    fields: ["email", "password"],
  },
  PASSWORD_TOO_SHORT: {
    message: "Password must be at least 8 characters.",
    fields: ["password"],
  },
  PASSWORD_TOO_LONG: { message: "Password is too long.", fields: ["password"] },
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: {
    message: "An account with this email already exists.",
    fields: ["email"],
  },
  // Change Password's own error — Better Auth reuses this same generic
  // code for "current password is wrong", the only realistic failure
  // that form can hit once client-side length validation already passed.
  INVALID_PASSWORD: {
    message: "Current password is incorrect.",
    fields: ["currentPassword"],
  },
};

const FALLBACK: MappedAuthError = {
  message: "Something went wrong. Please try again.",
  fields: [],
};

// A 500 means the server itself crashed — an unhandled exception, not a
// deliberate Better Auth validation error. Better Auth never assigns a
// `code` to those, so the HTTP status is the only signal we get. The most
// common cause is Postgres not running or migrations not applied; the
// actual stack trace only ever shows up server-side (the terminal running
// `pnpm dev`), never in the response body, so there's nothing more specific
// that's safe to show here.
const SERVER_ERROR: MappedAuthError = {
  message: "Internal server error. Please try again in a moment.",
  fields: [],
};

export function mapAuthError(
  code: string | undefined,
  // The raw error Better Auth's client returned. Never rendered in the UI
  // — that could leak internals to whoever's looking at the screen — only
  // logged to the console outside production, one click away in devtools.
  debugInfo?: Record<string, unknown>,
): MappedAuthError {
  const mapped = code ? ERRORS[code] : undefined;
  if (mapped) {
    return mapped;
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(
      "[auth] Unrecognized error from Better Auth — showing a generic message in the UI. " +
        "If status is 500, check the terminal running `pnpm dev` for the actual server-side " +
        "stack trace, and confirm Postgres is running and migrated " +
        "(`pnpm db:up`, `pnpm db:migrate`).",
      { code, ...debugInfo },
    );
  }

  const status = debugInfo?.status;
  if (typeof status === "number" && status >= 500) {
    return SERVER_ERROR;
  }

  return FALLBACK;
}
