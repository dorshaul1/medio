import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// client.ts is intentionally `server-only` (it holds the Bearer token) and
// reads the validated env singleton — both are mocked here the same way,
// scoped to this test file only (vi.mock calls are hoisted above the
// import below), so the module can be exercised under Vitest's plain Node
// resolution without weakening the real guard Next's bundler enforces for
// accidental Client Component imports.
vi.mock("server-only", () => ({}));
vi.mock("@/config/env/server", () => ({ env: { TMDB_API_TOKEN: "test-token" } }));

import { tmdbFetch } from "./client";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("tmdbFetch", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the TMDB token as a Bearer Authorization header, and a JSON Accept header", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await tmdbFetch("/movie/1");

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(requestInit.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("never puts the token in the URL", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await tmdbFetch("/movie/1", { query: { language: "en-US" } });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).not.toContain("test-token");
  });

  it("encodes query parameters and omits undefined ones", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await tmdbFetch("/search/movie", {
      query: { query: "the matrix", page: 2, include_adult: false, region: undefined },
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/3/search/movie");
    expect(parsed.searchParams.get("query")).toBe("the matrix");
    expect(parsed.searchParams.get("page")).toBe("2");
    expect(parsed.searchParams.get("include_adult")).toBe("false");
    expect(parsed.searchParams.has("region")).toBe(false);
  });

  it("returns the parsed JSON body on success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 42 }));

    await expect(tmdbFetch("/movie/42")).resolves.toEqual({ id: 42 });
  });

  it("maps a 404 to a not_found TmdbError without retrying", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status_message: "not found" }, { status: 404 }));

    await expect(tmdbFetch("/movie/999999")).rejects.toMatchObject({
      name: "TmdbError",
      kind: "not_found",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps a 401 to an unauthorized TmdbError — a configuration problem, not a not-found", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status_message: "Invalid API key" }, { status: 401 }),
    );

    await expect(tmdbFetch("/movie/1")).rejects.toMatchObject({
      name: "TmdbError",
      kind: "unauthorized",
    });
  });

  it("retries once on a 429, then succeeds if the retry works", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status_message: "rate limited" }, { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }));

    await expect(tmdbFetch("/movie/1")).resolves.toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once on a 500, then gives up as rate_limited/unavailable after the retry also fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }));

    await expect(tmdbFetch("/movie/1")).rejects.toMatchObject({
      name: "TmdbError",
      kind: "unavailable",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a plain 400 — not a transient failure", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 400 }));

    await expect(tmdbFetch("/movie/1")).rejects.toMatchObject({ kind: "unknown" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails predictably when the body isn't valid JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html>not json</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    await expect(tmdbFetch("/movie/1")).rejects.toMatchObject({
      name: "TmdbError",
      kind: "invalid_response",
    });
  });

  it("propagates the caller's own abort as-is, rather than wrapping it in a TmdbError", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });

    const pending = tmdbFetch("/movie/1", { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
