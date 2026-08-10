import { describe, expect, it } from "vitest";
import { convertLetterboxdRating, parseLetterboxdFiles } from "./letterboxd";

describe("parseLetterboxdFiles — diary.csv", () => {
  it("parses watched films with real dates, including rewatches as separate rows", () => {
    const diary = [
      "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date",
      "2026-08-01,Fight Club,1999,https://letterboxd.com/film/fight-club/,4.5,,,2026-08-01",
      "2026-08-05,Fight Club,1999,https://letterboxd.com/film/fight-club/,,Yes,,2026-08-05",
    ].join("\n");

    const result = parseLetterboxdFiles([{ name: "diary.csv", content: diary }]);
    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(2);
    expect(result.records.every((r) => r.kind === "movieWatch")).toBe(true);
    // Two distinct dates — real rewatches, never collapsed.
    const dates = result.records.map((r) =>
      r.kind === "movieWatch" ? r.watchedAt.toISOString() : "",
    );
    expect(new Set(dates).size).toBe(2);
  });

  it("carries the film title/year as a titleYear identity ref (no TMDB id in Letterboxd exports)", () => {
    const diary = ["Name,Year,Watched Date", "Fight Club,1999,2026-08-01"].join("\n");
    const result = parseLetterboxdFiles([{ name: "diary.csv", content: diary }]);
    expect(result.records[0]?.identity).toEqual({
      kind: "titleYear",
      mediaType: "movie",
      title: "Fight Club",
      year: 1999,
    });
  });

  it("reports a row with no Watched Date, without dropping the rest of the file", () => {
    const diary = ["Name,Year,Watched Date", "Fight Club,1999,", "Se7en,1995,2026-08-01"].join(
      "\n",
    );
    const result = parseLetterboxdFiles([{ name: "diary.csv", content: diary }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.reason).toMatch(/no Watched Date/);
    expect(result.records).toHaveLength(1);
  });

  it("reports a malformed Watched Date", () => {
    const diary = ["Name,Watched Date", "Fight Club,not-a-date"].join("\n");
    const result = parseLetterboxdFiles([{ name: "diary.csv", content: diary }]);
    expect(result.errors[0]?.reason).toMatch(/invalid Watched Date/);
  });

  it("works without a Year column", () => {
    const diary = ["Name,Watched Date", "Fight Club,2026-08-01"].join("\n");
    const result = parseLetterboxdFiles([{ name: "diary.csv", content: diary }]);
    expect(result.records[0]?.identity).toMatchObject({ title: "Fight Club", year: null });
  });
});

describe("parseLetterboxdFiles — ratings.csv", () => {
  it("parses ratings and converts the half-star scale, keeping the source label", () => {
    const ratings = ["Name,Year,Rating", "Fight Club,1999,4.5"].join("\n");
    const result = parseLetterboxdFiles([{ name: "ratings.csv", content: ratings }]);
    expect(result.records).toEqual([
      {
        kind: "rating",
        identity: { kind: "titleYear", mediaType: "movie", title: "Fight Club", year: 1999 },
        rating: 5,
        sourceRatingLabel: "4.5★ (Letterboxd)",
      },
    ]);
  });

  it("rejects an out-of-range rating", () => {
    const ratings = ["Name,Rating", "Fight Club,7"].join("\n");
    const result = parseLetterboxdFiles([{ name: "ratings.csv", content: ratings }]);
    expect(result.errors).toHaveLength(1);
    expect(result.records).toEqual([]);
  });
});

describe("convertLetterboxdRating", () => {
  it.each([
    [0.5, 1],
    [1, 1],
    [2.5, 3],
    [3, 3],
    [3.5, 4],
    [4.5, 5],
    [5, 5],
  ])("rounds %s stars to %s", (raw, expected) => {
    expect(convertLetterboxdRating(raw)).toBe(expected);
  });
});

describe("parseLetterboxdFiles — watchlist.csv", () => {
  it("maps every entry to Watchlist intent, never Backlog", () => {
    const watchlist = ["Name,Year", "The Third Reel,2021"].join("\n");
    const result = parseLetterboxdFiles([{ name: "watchlist.csv", content: watchlist }]);
    expect(result.records).toEqual([
      {
        kind: "planningItem",
        identity: { kind: "titleYear", mediaType: "movie", title: "The Third Reel", year: 2021 },
        intent: "watchlist",
      },
    ]);
  });
});

describe("parseLetterboxdFiles — multiple files, auto-detected", () => {
  it("correctly classifies diary/ratings/watchlist files uploaded together", () => {
    const diary = ["Name,Watched Date", "Fight Club,2026-08-01"].join("\n");
    const ratings = ["Name,Rating", "Fight Club,4.5"].join("\n");
    const watchlist = ["Name", "The Third Reel"].join("\n");

    const result = parseLetterboxdFiles([
      { name: "diary.csv", content: diary },
      { name: "ratings.csv", content: ratings },
      { name: "watchlist.csv", content: watchlist },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.records.map((r) => r.kind).sort()).toEqual([
      "movieWatch",
      "planningItem",
      "rating",
    ]);
  });

  it("reports an unrecognized file without failing the whole upload", () => {
    const unknown = ["Foo,Bar", "1,2"].join("\n");
    const diary = ["Name,Watched Date", "Fight Club,2026-08-01"].join("\n");
    const result = parseLetterboxdFiles([
      { name: "mystery.csv", content: unknown },
      { name: "diary.csv", content: diary },
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.reason).toMatch(/doesn't match a recognized Letterboxd/);
    expect(result.records).toHaveLength(1);
  });
});
