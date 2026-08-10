import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv-parse";

describe("parseCsv", () => {
  it("parses a simple CSV into header-keyed rows", () => {
    const result = parseCsv("Name,Year\nFight Club,1999\nSe7en,1995\n");
    expect(result.headers).toEqual(["Name", "Year"]);
    expect(result.rows).toEqual([
      { Name: "Fight Club", Year: "1999" },
      { Name: "Se7en", Year: "1995" },
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const result = parseCsv('Name,Year\n"Léon, the Professional",1994\n');
    expect(result.rows[0]?.Name).toBe("Léon, the Professional");
  });

  it("handles escaped quotes inside a quoted field", () => {
    const result = parseCsv('Name\n"She said ""hello""."\n');
    expect(result.rows[0]?.Name).toBe('She said "hello".');
  });

  it("handles a field with an embedded newline", () => {
    const result = parseCsv('Name,Note\nFilm,"line one\nline two"\n');
    expect(result.rows[0]?.Note).toBe("line one\nline two");
  });

  it("handles CRLF line endings", () => {
    const result = parseCsv("Name,Year\r\nFight Club,1999\r\n");
    expect(result.rows).toEqual([{ Name: "Fight Club", Year: "1999" }]);
  });

  it("handles a trailing row with no final newline", () => {
    const result = parseCsv("Name\nFight Club");
    expect(result.rows).toEqual([{ Name: "Fight Club" }]);
  });

  it("returns empty headers/rows for empty input", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });

  it("fills a missing trailing column with an empty string", () => {
    const result = parseCsv("Name,Year,Rating\nFight Club,1999\n");
    expect(result.rows[0]).toEqual({ Name: "Fight Club", Year: "1999", Rating: "" });
  });
});
