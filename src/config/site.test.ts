import { describe, expect, it } from "vitest";
import { siteConfig } from "./site";

describe("siteConfig", () => {
  it("exposes the product name used by metadata and the nav wordmark", () => {
    expect(siteConfig.name).toBe("MEDIO");
  });
});
