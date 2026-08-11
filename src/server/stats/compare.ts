// Pure comparison-insight derivation — no I/O. Turns two already-computed
// `StatsProfile`s (the selected range and its immediately-preceding
// equivalent period) into a small set of human-language facts — see
// docs/stats.md, "Comparison". Never a raw `{ metric, delta, percent }`
// tuple the UI has to phrase, and never a red/green up/down judgment
// (watching more or less isn't inherently good or bad — see CLAUDE.md,
// "No judgment"). Only facts that are actually true differences appear;
// nothing changed means nothing is said.
import { MIN_MOVIE_VS_SHOW_SHIFT_POINTS } from "./constants";
import type { ComparisonFact, StatsComparison, StatsProfile } from "./types";

function directionWord(delta: number): "more" | "fewer" {
  return delta > 0 ? "more" : "fewer";
}

function volumeFact(
  kind: "movies" | "episodes" | "shows",
  noun: string,
  current: number,
  previous: number,
  previousLabel: string,
): ComparisonFact | null {
  if (current === previous) return null;
  return {
    kind,
    text: `You watched ${directionWord(current - previous)} ${noun} than ${previousLabel} (${previous} → ${current}).`,
  };
}

function genreShiftFact(current: StatsProfile, previous: StatsProfile): ComparisonFact | null {
  const currentTop = current.genres.mostWatched[0];
  const previousTop = previous.genres.mostWatched[0];
  if (!currentTop) return null;
  if (previousTop && previousTop.genreId === currentTop.genreId) return null;

  return {
    kind: "genreShift",
    text: previousTop
      ? `${currentTop.genreName} became more prominent than ${previousTop.genreName} was.`
      : `${currentTop.genreName} emerged as a genre you watch a lot.`,
  };
}

function movieVsShowShiftFact(
  current: StatsProfile,
  previous: StatsProfile,
  previousLabel: string,
): ComparisonFact | null {
  const currentSplit = current.movieVsShow;
  const previousSplit = previous.movieVsShow;
  if (!currentSplit || !previousSplit) return null;

  const shift = currentSplit.moviePercent - previousSplit.moviePercent;
  if (Math.abs(shift) < MIN_MOVIE_VS_SHOW_SHIFT_POINTS) return null;

  const towards = shift > 0 ? "Movies" : "Shows";
  return {
    kind: "movieVsShowShift",
    text: `You leaned more toward ${towards} than ${previousLabel}.`,
  };
}

// Movies/Shows compare on *unique titles* (matching Overview's own
// framing); Episodes deliberately compares viewing *events*, not unique
// episodes — "TV activity" is a volume-of-watching question (rewatches
// genuinely represent more time spent), whereas the Movies/Shows facts
// mirror the unique-title semantics used everywhere else in this domain.
export function deriveStatsComparison(
  current: StatsProfile,
  previous: StatsProfile,
  previousLabel: string,
): StatsComparison {
  const facts = [
    volumeFact(
      "movies",
      "Movies",
      current.overview.uniqueMoviesWatched,
      previous.overview.uniqueMoviesWatched,
      previousLabel,
    ),
    volumeFact(
      "episodes",
      "Episodes",
      current.overview.episodeWatchEventCount,
      previous.overview.episodeWatchEventCount,
      previousLabel,
    ),
    volumeFact(
      "shows",
      "Shows",
      current.overview.uniqueShowsWatched,
      previous.overview.uniqueShowsWatched,
      previousLabel,
    ),
    genreShiftFact(current, previous),
    movieVsShowShiftFact(current, previous, previousLabel),
  ].filter((fact): fact is ComparisonFact => fact !== null);

  if (facts.length === 0) return null;
  return { previousLabel, facts };
}
