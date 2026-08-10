import { describe, expect, it } from "vitest";
import { buildCsv, sanitizeCsvCell } from "./csv-write";

describe("sanitizeCsvCell", () => {
  it.each(["=cmd|'/c calc'!A1", "+1+1", "-2+3", "@SUM(A1:A2)"])(
    "neutralizes a formula-injection cell (%s) with a leading apostrophe",
    (value) => {
      expect(sanitizeCsvCell(value)).toBe(`'${value}`);
    },
  );

  it("leaves an ordinary title untouched", () => {
    expect(sanitizeCsvCell("Fight Club")).toBe("Fight Club");
  });

  it("does not touch a value merely containing = later in the string", () => {
    expect(sanitizeCsvCell("Se7en = Seven")).toBe("Se7en = Seven");
  });
});

describe("buildCsv", () => {
  it("quotes a cell containing a comma", () => {
    const csv = buildCsv(["Name"], [["Léon, the Professional"]]);
    expect(csv).toContain('"Léon, the Professional"');
  });

  it("escapes an embedded quote by doubling it", () => {
    const csv = buildCsv(["Name"], [['She said "hello"']]);
    expect(csv).toContain('"She said ""hello"""');
  });

  it("sanitizes a formula-injection cell inline in a real row", () => {
    const csv = buildCsv(["Title"], [["=cmd|'/c calc'!A1"]]);
    const [, dataLine] = csv.split("\r\n");
    expect(dataLine?.startsWith("'=")).toBe(true);
  });

  it("uses CRLF line endings", () => {
    const csv = buildCsv(["A", "B"], [["1", "2"]]);
    expect(csv).toBe("A,B\r\n1,2");
  });
});
