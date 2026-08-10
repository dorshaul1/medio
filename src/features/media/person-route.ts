import type { Route } from "next";

// The canonical Person detail URL — keyed by TMDB's own numeric person
// ID, not an application-owned database ID (no Person table exists; see
// docs/media-provider.md, "People"). A template literal built from a
// `number` needs the same `as Route` cast Next's own docs use for any
// non-literal href — see the equivalent comment on mediaHref
// (features/media/media-route.ts).
export function personHref(id: number): Route {
  return `/people/${id}` as Route;
}
