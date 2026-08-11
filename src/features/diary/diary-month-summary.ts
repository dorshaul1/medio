import type { DiaryMonthActivity } from "@/server/diary/types";

// A very small monthly overview line ("8 movies · 24 episodes") — see
// docs/diary.md, "Monthly overview". Deliberately not a chart or KPI
// card (see CLAUDE.md, "Stats"); chronology stays primary, this is one
// quiet line of context above it. Returns `null` for a sparse month
// (nothing to summarize — the sparse-state message already covers that)
// rather than rendering "0 movies · 0 episodes".
export function formatDiaryMonthSummary(
  summary: Pick<DiaryMonthActivity, "movieCount" | "episodeCount">,
): string | null {
  const { movieCount, episodeCount } = summary;
  if (movieCount === 0 && episodeCount === 0) return null;

  const parts: string[] = [];
  if (movieCount > 0) parts.push(`${movieCount} ${movieCount === 1 ? "movie" : "movies"}`);
  if (episodeCount > 0) {
    parts.push(`${episodeCount} ${episodeCount === 1 ? "episode" : "episodes"}`);
  }
  return parts.join(" · ");
}
