// A concise, typed representation of everything that can go wrong talking
// to TMDB — callers (queries.ts today, product server code later) branch on
// `kind`, never on a parsed HTTP status or a raw message string. Never
// carries the request's Authorization header or the API token.
export type TmdbErrorKind =
  // Missing/invalid TMDB_API_TOKEN, or TMDB rejected it (401/403) — a
  // configuration problem, not something a user caused.
  | "unauthorized"
  // The requested movie/show/season genuinely doesn't exist (404).
  | "not_found"
  // TMDB's rate limit was hit (429).
  | "rate_limited"
  // TMDB is down/erroring (5xx), or the request timed out/network-failed.
  | "unavailable"
  // TMDB responded 2xx but the body didn't match the fields we depend on.
  | "invalid_response"
  // Anything else — an unexpected non-2xx status, for example.
  | "unknown";

export class TmdbError extends Error {
  readonly kind: TmdbErrorKind;
  readonly status: number | undefined;

  constructor(
    kind: TmdbErrorKind,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "TmdbError";
    this.kind = kind;
    this.status = options?.status;
  }
}

// Maps an HTTP status from a non-2xx TMDB response to an error kind.
// `bodyMessage` is TMDB's own `status_message`, if the body parsed as JSON
// and had one — used only for the (server-side, never-UI) error message.
export function tmdbErrorFromStatus(status: number, bodyMessage?: string): TmdbError {
  const detail = bodyMessage ? `: ${bodyMessage}` : "";

  if (status === 401 || status === 403) {
    return new TmdbError("unauthorized", `TMDB rejected the request (${status})${detail}`, {
      status,
    });
  }
  if (status === 404) {
    return new TmdbError("not_found", `TMDB resource not found (404)${detail}`, { status });
  }
  if (status === 429) {
    return new TmdbError("rate_limited", `TMDB rate limit exceeded (429)${detail}`, { status });
  }
  if (status >= 500) {
    return new TmdbError("unavailable", `TMDB server error (${status})${detail}`, { status });
  }
  return new TmdbError("unknown", `Unexpected TMDB response (${status})${detail}`, { status });
}
