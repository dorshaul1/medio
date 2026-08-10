// Shared by every "pick a past date" control that pairs a typeable
// `YYYY-MM-DD` text input with the real month-grid `Calendar`
// (`components/ui/calendar.tsx`) — first `MovieTrackingControl`'s
// backdate popover, now `DiaryEntryMenu`'s "Edit watch date" dialog too;
// a real second use case, not spun out speculatively (see CLAUDE.md).
const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Rejects both malformed text and calendar-invalid dates (e.g. Feb 30,
// which `Date` would otherwise silently roll over into March 2nd) —
// returns `null` for anything not cleanly parseable, rather than
// guessing.
export function parseDateInputValue(value: string): Date | null {
  const match = DATE_INPUT_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}
