import { describe, expect, it } from "vitest";
import { parseNativeExport } from "./native";

function validExport() {
  return {
    schemaVersion: 1,
    exportedAt: "2026-08-10T00:00:00.000Z",
    data: {
      movieWatchEvents: [
        {
          movieProviderId: 550,
          title: "Fight Club",
          year: 1999,
          watchedAt: "2026-08-01T10:00:00.000Z",
        },
      ],
      episodeWatchEvents: [
        {
          showProviderId: 1399,
          showTitle: "Winter's Watch",
          seasonNumber: 1,
          episodeNumber: 1,
          episodeProviderId: 63056,
          watchedAt: "2026-08-02T10:00:00.000Z",
        },
      ],
      planningItems: [
        {
          mediaType: "movie",
          mediaProviderId: 551,
          title: "Se7en",
          year: 1995,
          intent: "watchlist",
        },
      ],
      showTrackingState: [{ showProviderId: 1399, title: "Winter's Watch", status: "watching" }],
      comments: [
        {
          mediaType: "movie",
          mediaProviderId: 550,
          title: "Fight Club",
          year: 1999,
          content: "Loved it",
        },
      ],
    },
  };
}

describe("parseNativeExport", () => {
  it("parses every domain with known (non-titleYear) identity", () => {
    const result = parseNativeExport(validExport());
    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(5);
    const movie = result.records.find((r) => r.kind === "movieWatch");
    expect(movie?.identity).toEqual({ kind: "known", mediaType: "movie", providerId: 550 });
  });

  it("preserves exact timestamp precision", () => {
    const result = parseNativeExport(validExport());
    const movie = result.records.find((r) => r.kind === "movieWatch");
    expect(movie && "datePrecision" in movie ? movie.datePrecision : undefined).toBe("exact");
  });

  it("rejects malformed JSON structure", () => {
    const result = parseNativeExport({ not: "a valid export" });
    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.reason).toMatch(/isn't a valid MEDIO export/);
  });

  it("rejects a schema version newer than this app supports", () => {
    const result = parseNativeExport({ ...validExport(), schemaVersion: 999 });
    expect(result.records).toEqual([]);
    expect(result.errors[0]?.reason).toMatch(/newer version of MEDIO/);
  });

  it("reports a malformed individual watch timestamp without dropping the whole file", () => {
    const broken = validExport();
    const [firstMovie] = broken.data.movieWatchEvents;
    if (!firstMovie) throw new Error("expected a fixture movie watch event");
    firstMovie.watchedAt = "not-a-date";
    const result = parseNativeExport(broken);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.reason).toMatch(/Invalid watch timestamp/);
    // The other 4 valid records still import.
    expect(result.records).toHaveLength(4);
  });

  it("handles an empty export", () => {
    const empty = {
      schemaVersion: 1,
      exportedAt: "2026-08-10T00:00:00.000Z",
      data: {
        movieWatchEvents: [],
        episodeWatchEvents: [],
        planningItems: [],
        showTrackingState: [],
        comments: [],
      },
    };
    const result = parseNativeExport(empty);
    expect(result.records).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
