import type { DiaryPeriod } from "@/server/diary/types";

// Shared by `DiaryMonthNav` (the picker trigger) and the Diary page
// (sparse-month copy) — one formatting basis so "August 2026" never
// reads differently in two places on the same page. UTC, matching the
// same month-boundary basis the rest of Diary's month scoping uses (see
// docs/diary.md, "Month navigation and timezone").
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDiaryMonthLabel(period: DiaryPeriod): string {
  return MONTH_LABEL_FORMATTER.format(new Date(Date.UTC(period.year, period.month - 1, 1)));
}
