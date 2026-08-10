import { describe, expect, it } from "vitest";
import {
  assertSafeDatabaseUrlForE2e,
  computeTrustedOrigins,
  parseServerEnv,
  resolveBetterAuthUrl,
} from "./schema";

const VALID_ENV = {
  DATABASE_URL: "postgresql://untitled:untitled@localhost:5432/untitled",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  TMDB_API_TOKEN: "test-tmdb-token",
};

describe("parseServerEnv", () => {
  it("accepts a fully valid environment", () => {
    const env = parseServerEnv(VALID_ENV);

    expect(env.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL);
    expect(env.BETTER_AUTH_SECRET).toBe(VALID_ENV.BETTER_AUTH_SECRET);
    expect(env.BETTER_AUTH_URL).toBe(VALID_ENV.BETTER_AUTH_URL);
    expect(env.TMDB_API_TOKEN).toBe(VALID_ENV.TMDB_API_TOKEN);
  });

  it("accepts the postgres:// scheme alias", () => {
    expect(() =>
      parseServerEnv({
        ...VALID_ENV,
        DATABASE_URL: "postgres://untitled:untitled@localhost:5432/untitled",
      }),
    ).not.toThrow();
  });

  it("rejects a missing DATABASE_URL", () => {
    const { DATABASE_URL: _omit, ...rest } = VALID_ENV;
    expect(() => parseServerEnv(rest)).toThrow();
  });

  it("rejects a malformed DATABASE_URL", () => {
    expect(() => parseServerEnv({ ...VALID_ENV, DATABASE_URL: "not-a-url" })).toThrow();
  });

  it("rejects a connection string with the wrong protocol", () => {
    expect(() =>
      parseServerEnv({ ...VALID_ENV, DATABASE_URL: "mysql://user:pass@localhost:3306/db" }),
    ).toThrow();
  });

  it("rejects a missing BETTER_AUTH_SECRET", () => {
    const { BETTER_AUTH_SECRET: _omit, ...rest } = VALID_ENV;
    expect(() => parseServerEnv(rest)).toThrow();
  });

  it("rejects a BETTER_AUTH_SECRET shorter than 32 characters", () => {
    expect(() => parseServerEnv({ ...VALID_ENV, BETTER_AUTH_SECRET: "too-short" })).toThrow();
  });

  it("rejects a missing or malformed BETTER_AUTH_URL", () => {
    const { BETTER_AUTH_URL: _omit, ...rest } = VALID_ENV;
    expect(() => parseServerEnv(rest)).toThrow();
    expect(() => parseServerEnv({ ...VALID_ENV, BETTER_AUTH_URL: "not-a-url" })).toThrow();
  });

  it("rejects a missing or empty TMDB_API_TOKEN", () => {
    const { TMDB_API_TOKEN: _omit, ...rest } = VALID_ENV;
    expect(() => parseServerEnv(rest)).toThrow();
    expect(() => parseServerEnv({ ...VALID_ENV, TMDB_API_TOKEN: "" })).toThrow();
  });
});

describe("resolveBetterAuthUrl", () => {
  it("prefers an explicit BETTER_AUTH_URL over VERCEL_URL", () => {
    expect(
      resolveBetterAuthUrl({
        BETTER_AUTH_URL: "https://medio.example",
        VERCEL_URL: "medio-git-preview.vercel.app",
      }),
    ).toBe("https://medio.example");
  });

  it("falls back to https:// + VERCEL_URL when BETTER_AUTH_URL is unset", () => {
    expect(resolveBetterAuthUrl({ VERCEL_URL: "medio-git-preview.vercel.app" })).toBe(
      "https://medio-git-preview.vercel.app",
    );
  });

  it("returns undefined when neither is set", () => {
    expect(resolveBetterAuthUrl({})).toBeUndefined();
  });
});

describe("assertSafeDatabaseUrlForE2e", () => {
  it("does nothing outside an E2E run", () => {
    expect(() =>
      assertSafeDatabaseUrlForE2e({}, "postgresql://user:pass@some-neon-host.neon.tech/db"),
    ).not.toThrow();
  });

  it("allows localhost during an E2E run", () => {
    expect(() =>
      assertSafeDatabaseUrlForE2e({ E2E_TEST_RUN: "1" }, "postgresql://ci:ci@localhost:5432/ci"),
    ).not.toThrow();
  });

  it("allows 127.0.0.1 during an E2E run", () => {
    expect(() =>
      assertSafeDatabaseUrlForE2e({ E2E_TEST_RUN: "1" }, "postgresql://ci:ci@127.0.0.1:5432/ci"),
    ).not.toThrow();
  });

  it("refuses any non-local host during an E2E run, e.g. a real Neon database", () => {
    expect(() =>
      assertSafeDatabaseUrlForE2e(
        { E2E_TEST_RUN: "1" },
        "postgresql://user:pass@ep-real-project-pooler.eu-central-1.aws.neon.tech/medio",
      ),
    ).toThrow(/non-local database/);
  });
});

describe("computeTrustedOrigins", () => {
  it("always trusts any localhost port, even outside Vercel", () => {
    expect(computeTrustedOrigins({})).toEqual(["http://localhost:*"]);
  });

  it("adds this project's own Vercel aliases on Vercel, never every *.vercel.app", () => {
    const origins = computeTrustedOrigins({ VERCEL: "1" });
    expect(origins).toContain("http://localhost:*");
    expect(origins).toContain("https://medio-*.vercel.app");
    expect(origins).not.toContain("https://*.vercel.app");
  });
});
