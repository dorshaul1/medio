import type { Route } from "next";
import type { MediaType } from "@/server/media/types";

// Canonical detail-page URLs, keyed by TMDB's own numeric provider ID —
// not an application-owned database ID (no media table exists; see
// docs/media-provider.md, "Identifiers"). `/movies/[id]` and `/shows/[id]`
// currently render minimal placeholders (see their page.tsx) — full detail
// pages are a later phase, but the routes and links are real now.
export function mediaHref(media: { mediaType: MediaType; id: number }): Route {
  // A template literal built from a `number`-typed id, not a string
  // literal — TypeScript's typed-route inference only applies to literal
  // expressions written directly in JSX/router-call position, not to a
  // value returned from a helper function, so this needs the same `as
  // Route` cast Next's own docs use for any non-literal href.
  return (media.mediaType === "movie" ? `/movies/${media.id}` : `/shows/${media.id}`) as Route;
}
