import { describe, expect, it } from "vitest";
import { resolveEpisodeSpoilerDecision } from "./policy";

describe("resolveEpisodeSpoilerDecision", () => {
  it("hides nothing when protection is off", () => {
    expect(resolveEpisodeSpoilerDecision({ protection: "off", watched: false })).toEqual({
      hideOverview: false,
      hideIdentity: false,
    });
  });

  it("hides only the overview under Standard", () => {
    expect(resolveEpisodeSpoilerDecision({ protection: "standard", watched: false })).toEqual({
      hideOverview: true,
      hideIdentity: false,
    });
  });

  it("hides the overview and identity (still/title) under Strict", () => {
    expect(resolveEpisodeSpoilerDecision({ protection: "strict", watched: false })).toEqual({
      hideOverview: true,
      hideIdentity: true,
    });
  });

  it("never hides a watched episode's content, regardless of protection level", () => {
    for (const protection of ["off", "standard", "strict"] as const) {
      expect(resolveEpisodeSpoilerDecision({ protection, watched: true })).toEqual({
        hideOverview: false,
        hideIdentity: false,
      });
    }
  });
});
