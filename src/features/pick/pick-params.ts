import {
  TIME_BUDGET_HOUR_MINUTES,
  TIME_BUDGET_MOVIE_NIGHT_MINUTES,
  TIME_BUDGET_QUICK_MINUTES,
} from "@/server/pick/constants";
import type { DecisionContext } from "@/server/pick/types";

// Pick's Format/Time context is URL-addressable via `?format=`/`?time=`
// for refresh, deep-linking, and testing — see docs/recommendations.md,
// "URL state". The session-only "Not now" exclusion set and variety seed
// deliberately never appear here (see docs/recommendations.md,
// "Session-only context") — an invalid/missing param never errors, it
// just falls back to "no preference", the same discipline as Discover's
// own `discover-params.ts`.
function isFormat(value: string | undefined): value is DecisionContext["mediaType"] {
  return value === "movie" || value === "show";
}

// A plain literal-value map, not derived from `DecisionContext` — the
// "no preference" (`null`) case has no URL key at all, so it's excluded
// from this table's value type entirely rather than modeled as a branch
// that never actually gets a key.
const TIME_PARAM_TO_MINUTES: Record<string, 35 | 65 | 150> = {
  quick: TIME_BUDGET_QUICK_MINUTES,
  hour: TIME_BUDGET_HOUR_MINUTES,
  "movie-night": TIME_BUDGET_MOVIE_NIGHT_MINUTES,
};

const MINUTES_TO_TIME_PARAM = new Map<number, string>(
  Object.entries(TIME_PARAM_TO_MINUTES).map(([key, minutes]) => [minutes, key]),
);

export function parseDecisionContextParams(params: {
  format?: string | string[];
  time?: string | string[];
}): DecisionContext {
  const format = Array.isArray(params.format) ? params.format[0] : params.format;
  const time = Array.isArray(params.time) ? params.time[0] : params.time;

  return {
    mediaType: isFormat(format) ? format : "any",
    timeBudgetMinutes: time ? (TIME_PARAM_TO_MINUTES[time] ?? null) : null,
  };
}

// Builds the query string PickExperience pushes to the URL whenever
// Format/Time changes, so a refresh or shared link reproduces the same
// context. Empty for the default "no preference" context, matching
// Discover's own "an absent param just means the default" convention.
export function decisionContextToSearch(context: DecisionContext): string {
  const search = new URLSearchParams();
  if (context.mediaType !== "any") search.set("format", context.mediaType);
  if (context.timeBudgetMinutes !== null) {
    const key = MINUTES_TO_TIME_PARAM.get(context.timeBudgetMinutes);
    if (key) search.set("time", key);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
