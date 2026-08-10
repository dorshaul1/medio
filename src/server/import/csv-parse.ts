// A small, correct RFC 4180 CSV parser — hand-written rather than a new
// dependency (see CLAUDE.md, "Don't add a dependency without a clear,
// current need"): quoted-field/escaped-quote/embedded-comma parsing is a
// bounded, well-understood algorithm, and this is untrusted user-
// uploaded input (Letterboxd/generic CSV imports — see
// docs/data-portability.md, "Security"), so keeping it in this codebase
// keeps it auditable rather than trusting an opaque package with
// unknown parsing edge cases. Handles quoted fields, `""`-escaped quotes
// inside a quoted field, commas/newlines inside quoted fields, and both
// `\n`/`\r\n` line endings.
export type CsvRow = Record<string, string>;

export type CsvParseResult = {
  headers: readonly string[];
  rows: readonly CsvRow[];
};

function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      pushField();
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += char;
    i++;
  }

  // A trailing row with no final newline.
  if (field.length > 0 || row.length > 0) pushRow();

  return rows;
}

// Parses CSV text into header-keyed rows. The first non-empty line is
// always the header row — every supported source (Letterboxd, MEDIO's
// own generic CSV template) requires one; there is no headerless mode.
// Header lookup elsewhere in this domain is case-insensitive/alias-
// tolerant (see `server/import/parsers/letterboxd.ts`), not enforced
// here — this stays a plain structural parse.
export function parseCsv(text: string): CsvParseResult {
  const lines = parseCsvLines(text).filter((line) => !(line.length === 1 && line[0] === ""));
  if (lines.length === 0) return { headers: [], rows: [] };

  const [headerLine, ...dataLines] = lines;
  const headers = (headerLine ?? []).map((header) => header.trim());

  const rows = dataLines.map((line) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = line[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}
