// A tiny, dependency-free CSV writer shared by every export in this
// domain — see docs/data-portability.md, "Security".
function needsQuoting(value: string): boolean {
  return /[",\r\n]/.test(value);
}

// Neutralizes spreadsheet formula injection: a cell whose first
// character is one Excel/Google Sheets/LibreOffice would interpret as
// the start of a formula (`=`, `+`, `-`, `@`) gets a leading apostrophe,
// which every major spreadsheet app treats as "force this cell to plain
// text" rather than evaluating it — see CLAUDE.md, "Export CSV must be
// protected against spreadsheet-formula injection".
export function sanitizeCsvCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string): string {
  const sanitized = sanitizeCsvCell(value);
  return needsQuoting(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized;
}

export function buildCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return lines.join("\r\n");
}
