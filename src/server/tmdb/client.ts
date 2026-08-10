import "server-only";
import { env } from "@/config/env/server";
import { TmdbError, tmdbErrorFromStatus } from "./errors";

// Centralized so no other module repeats TMDB's origin. See
// docs/media-provider.md for why this (and the image CDN host in
// images.ts) are hardcoded constants rather than fetched from TMDB's
// /configuration endpoint.
//
// `TMDB_API_BASE_URL_OVERRIDE` is test infrastructure only — not a
// documented app config value, not in `.env.example`, not part of the
// validated env schema. It lets E2E point this at a local fixture server
// instead of live TMDB, so those tests stay deterministic (see
// e2e/tmdb-mock-server.ts) without adding a mocking dependency or an
// app-level config option that exists for no product reason.
const TMDB_API_BASE_URL = process.env.TMDB_API_BASE_URL_OVERRIDE || "https://api.themoviedb.org/3";

const REQUEST_TIMEOUT_MS = 8_000;

// TMDB GET requests are read-only and idempotent, so one retry for
// transient failures (rate limiting, a temporary 5xx) is safe. Kept
// deliberately simple: a single retry, a short fixed delay — not a
// generic backoff framework. Never retried: 4xx (other than 429),
// malformed responses, or a caller-initiated abort.
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;

export type TmdbFetchOptions = {
  query?: Record<string, string | number | boolean | undefined> | undefined;
  signal?: AbortSignal | undefined;
  // Passed straight through to `fetch`'s Next.js extension — callers own
  // the caching decision for their endpoint (see queries.ts).
  cache?: RequestCache | undefined;
  next?: { revalidate?: number | false; tags?: string[] } | undefined;
};

function buildUrl(path: string, query: TmdbFetchOptions["query"]): string {
  const url = new URL(`${TMDB_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new TmdbError("invalid_response", "TMDB response was not valid JSON", { cause });
  }
}

// The TMDB request primitive: base URL, Bearer auth, JSON Accept header,
// query params, a request timeout, and a small retry for transient
// failures. Returns the parsed-but-unvalidated JSON body — validating it
// against the fields a specific query actually depends on is schemas.ts's
// job (see queries.ts), not this generic primitive's.
export async function tmdbFetch(path: string, options: TmdbFetchOptions = {}): Promise<unknown> {
  const url = buildUrl(path, options.query);
  let lastError: TmdbError | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;

    // Built incrementally rather than as one object literal: DOM's
    // `RequestInit` (unlike our own `TmdbFetchOptions` above) doesn't
    // declare `cache`/`next` as accepting an explicit `undefined`, and
    // `exactOptionalPropertyTypes` treats "key present with value
    // undefined" as distinct from "key absent" — so `options.cache`/
    // `options.next` are only assigned once narrowed to be genuinely
    // present.
    const requestInit: RequestInit = {
      headers: {
        Authorization: `Bearer ${env.TMDB_API_TOKEN}`,
        Accept: "application/json",
      },
      signal,
    };
    if (options.cache !== undefined) {
      requestInit.cache = options.cache;
    }
    if (options.next !== undefined) {
      requestInit.next = options.next;
    }

    let response: Response;
    try {
      response = await fetch(url, requestInit);
    } catch (cause) {
      // The caller's own signal aborting is the caller's business, not a
      // provider failure — propagate it as-is rather than wrapping it.
      if (options.signal?.aborted) {
        throw cause;
      }
      // Otherwise this was our own request timeout, or a network-level
      // failure — both are "the provider is unavailable right now".
      lastError = new TmdbError("unavailable", "TMDB request failed or timed out", { cause });
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      return parseJsonBody(response);
    }

    if (response.status === 429 || response.status >= 500) {
      const bodyMessage = await readStatusMessage(response);
      lastError = tmdbErrorFromStatus(response.status, bodyMessage);
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
        continue;
      }
      throw lastError;
    }

    // Any other non-2xx (4xx other than 429): not retried.
    throw tmdbErrorFromStatus(response.status, await readStatusMessage(response));
  }

  // Unreachable — the loop above always returns or throws — but keeps
  // control flow explicit for TypeScript.
  throw lastError ?? new TmdbError("unknown", "TMDB request failed");
}

// Best-effort extraction of TMDB's own `status_message` for a clearer
// server-side log/error — never required, never surfaced raw to UI.
async function readStatusMessage(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.clone().json();
    if (body && typeof body === "object" && "status_message" in body) {
      const message = (body as { status_message: unknown }).status_message;
      return typeof message === "string" ? message : undefined;
    }
  } catch {
    // Body wasn't JSON (or was empty) — no extra detail available.
  }
  return undefined;
}
