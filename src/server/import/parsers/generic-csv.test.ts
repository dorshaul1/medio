import { describe, expect, it } from "vitest";
import { GENERIC_CSV_TEMPLATE, parseGenericCsv } from "./generic-csv";

describe("parseGenericCsv", () => {
  it("parses a movie watch row", () => {
    const csv = [
      "media_type,title,year,season,episode,watched_at,rating,list",
      "movie,Fight Club,1999,,,2026-08-01,,",
    ].join("\n");
    const result = parseGenericCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([
      {
        kind: "movieWatch",
        identity: { kind: "titleYear", mediaType: "movie", title: "Fight Club", year: 1999 },
        watchedAt: expect.any(Date),
        datePrecision: "dateOnly",
      },
    ]);
  });

  it("parses an exact episode watch row (show + season + episode)", () => {
    const csv = [
      "media_type,title,year,season,episode,watched_at",
      "show,Winter's Watch,2011,1,1,2020-01-01",
    ].join("\n");
    const result = parseGenericCsv(csv);
    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([
      {
        kind: "episodeWatch",
        identity: { kind: "titleYear", mediaType: "show", title: "Winter's Watch", year: 2011 },
        seasonNumber: 1,
        episodeNumber: 1,
        episodeProviderId: null,
        watchedAt: expect.any(Date),
        datePrecision: "dateOnly",
      },
    ]);
  });

  it("never fabricates episode history from a vague show-level watched date", () => {
    const csv = ["media_type,title,watched_at", "show,Winter's Watch,2020-01-01"].join("\n");
    const result = parseGenericCsv(csv);
    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.reason).toMatch(/vague show-level completion/);
  });

  it("supports a rating on its own", () => {
    const csv = ["media_type,title,rating", "movie,Fight Club,5"].join("\n");
    const result = parseGenericCsv(csv);
    expect(result.records).toEqual([
      {
        kind: "rating",
        identity: { kind: "titleYear", mediaType: "movie", title: "Fight Club", year: null },
        rating: 5,
        sourceRatingLabel: null,
      },
    ]);
  });

  it("rejects a rating outside 1-5", () => {
    const csv = ["media_type,title,rating", "movie,Fight Club,9"].join("\n");
    const result = parseGenericCsv(csv);
    expect(result.records).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  it("supports a watchlist/backlog entry", () => {
    const csv = ["media_type,title,list", "movie,The Third Reel,backlog"].join("\n");
    const result = parseGenericCsv(csv);
    expect(result.records).toEqual([
      {
        kind: "planningItem",
        identity: { kind: "titleYear", mediaType: "movie", title: "The Third Reel", year: null },
        intent: "backlog",
      },
    ]);
  });

  it("one row can produce a watch event and a rating together", () => {
    const csv = ["media_type,title,watched_at,rating", "movie,Fight Club,2026-08-01,5"].join("\n");
    const result = parseGenericCsv(csv);
    expect(result.records).toHaveLength(2);
    expect(result.records.map((r) => r.kind).sort()).toEqual(["movieWatch", "rating"]);
  });

  it("rejects an invalid media_type", () => {
    const csv = ["media_type,title", "podcast,Something"].join("\n");
    const result = parseGenericCsv(csv);
    expect(result.records).toEqual([]);
    expect(result.errors[0]?.reason).toMatch(/"movie" or "show"/);
  });

  it("rejects a row with no title", () => {
    const csv = ["media_type,title", "movie,"].join("\n");
    const result = parseGenericCsv(csv);
    expect(result.errors[0]?.reason).toMatch(/missing "title"/);
  });

  it("the downloadable template itself parses cleanly", () => {
    const result = parseGenericCsv(GENERIC_CSV_TEMPLATE);
    expect(result.errors).toEqual([]);
    expect(result.records.length).toBeGreaterThan(0);
  });
});
