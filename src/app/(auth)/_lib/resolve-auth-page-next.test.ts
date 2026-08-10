import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const redirect = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirect(path) }));

const getCurrentSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ getCurrentSession: () => getCurrentSession() }));

const { resolveAuthPageNext } = await import("./resolve-auth-page-next");

describe("resolveAuthPageNext", () => {
  it("returns the validated next path for a signed-out visitor", async () => {
    getCurrentSession.mockResolvedValue(null);
    await expect(resolveAuthPageNext("/library")).resolves.toBe("/library");
  });

  it("returns an empty string for a signed-out visitor with no/unsafe next", async () => {
    getCurrentSession.mockResolvedValue(null);
    await expect(resolveAuthPageNext(undefined)).resolves.toBe("");
    await expect(resolveAuthPageNext("//evil.com")).resolves.toBe("");
  });

  it("redirects an already-authenticated visitor to the validated next path", async () => {
    getCurrentSession.mockResolvedValue({ user: { id: "1" } });
    await expect(resolveAuthPageNext("/library")).rejects.toThrow("REDIRECT:/library");
  });

  it("redirects an already-authenticated visitor to '/' when next is missing/unsafe", async () => {
    getCurrentSession.mockResolvedValue({ user: { id: "1" } });
    await expect(resolveAuthPageNext("//evil.com")).rejects.toThrow("REDIRECT:/");
  });
});
