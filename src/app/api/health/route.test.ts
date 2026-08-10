import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const execute = vi.fn();
vi.mock("@/server/db", () => ({ db: { execute: (...args: unknown[]) => execute(...args) } }));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  it("returns 200 ok when the database is reachable", async () => {
    execute.mockResolvedValue(undefined);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 503 without leaking details when the database is unreachable", async () => {
    execute.mockRejectedValue(new Error("connection refused: postgresql://secret@host/db"));

    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ status: "error" });
    expect(JSON.stringify(body)).not.toContain("postgresql");
  });
});
