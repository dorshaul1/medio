import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const getSessionCookie = vi.fn();
vi.mock("better-auth/cookies", () => ({
  getSessionCookie: (...args: unknown[]) => getSessionCookie(...args),
}));

const { proxy } = await import("./proxy");

function request(path: string): NextRequest {
  return new NextRequest(new URL(path, "https://medio.example"));
}

describe("proxy", () => {
  it("lets a request with a session cookie through untouched", () => {
    getSessionCookie.mockReturnValue("a-real-cookie-value");
    const response = proxy(request("/library"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a logged-out request to Sign In with a safe return path", () => {
    getSessionCookie.mockReturnValue(null);
    const response = proxy(request("/shows/1399/seasons/2"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/sign-in");
    expect(location.searchParams.get("next")).toBe("/shows/1399/seasons/2");
  });

  it("preserves the query string in the return path", () => {
    getSessionCookie.mockReturnValue(null);
    const response = proxy(request("/discover?q=fight+club"));
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.searchParams.get("next")).toBe("/discover?q=fight+club");
  });
});
