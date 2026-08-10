import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDeveloperToolsEnabled } from "./guard";

describe("assertDeveloperToolsEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => assertDeveloperToolsEnabled()).toThrow();
  });

  it("does not throw outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(() => assertDeveloperToolsEnabled()).not.toThrow();
  });
});
