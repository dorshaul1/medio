// A pure URL-building helper — no credentials, no I/O, so unlike the rest
// of `src/server/tmdb/` this isn't `server-only`. It exists to stop every
// call site from hand-concatenating `https://image.tmdb.org/t/p/...` and a
// size string; components should call this instead of doing that
// themselves, wherever they end up rendering (Server or, once a resolved
// URL is just a plain prop, Client Components).
//
// TMDB's image CDN host and size-token format (`w342`, `original`, ...)
// have been stable for years, and are documented at
// https://developer.themoviedb.org/reference/configuration-details.
// Calling `/configuration` at runtime to re-derive the same handful of
// constants would add a network dependency (and a cache-invalidation
// question) for information that doesn't meaningfully change — see
// docs/media-provider.md for this decision.
import type { MediaImage } from "@/server/media/types";

const IMAGE_CDN_BASE_URL = "https://image.tmdb.org/t/p";

export type PosterSize = "small" | "medium" | "large";
export type BackdropSize = "medium" | "large";
export type StillSize = "medium";
export type ProfileSize = "medium" | "large";

const POSTER_SIZE_TOKENS: Record<PosterSize, string> = {
  small: "w154",
  medium: "w342",
  large: "w500",
};

const BACKDROP_SIZE_TOKENS: Record<BackdropSize, string> = {
  medium: "w780",
  large: "w1280",
};

const STILL_SIZE_TOKENS: Record<StillSize, string> = {
  medium: "w300",
};

// TMDB's documented profile-image size tokens (`profile_sizes` in
// `/configuration`) are their own small set — w45/w185/h632/original —
// distinct from poster/backdrop/still tokens, even though they share the
// same CDN. `large` uses a height-token (`h632`) rather than a width one:
// that's the one TMDB itself documents for a full-height profile photo.
const PROFILE_SIZE_TOKENS: Record<ProfileSize, string> = {
  medium: "w185",
  large: "h632",
};

function imageUrl(image: MediaImage | null, sizeToken: string): string | null {
  return image ? `${IMAGE_CDN_BASE_URL}/${sizeToken}${image.path}` : null;
}

export function posterUrl(image: MediaImage | null, size: PosterSize): string | null {
  return imageUrl(image, POSTER_SIZE_TOKENS[size]);
}

export function backdropUrl(image: MediaImage | null, size: BackdropSize): string | null {
  return imageUrl(image, BACKDROP_SIZE_TOKENS[size]);
}

export function stillUrl(image: MediaImage | null, size: StillSize = "medium"): string | null {
  return imageUrl(image, STILL_SIZE_TOKENS[size]);
}

export function profileUrl(image: MediaImage | null, size: ProfileSize): string | null {
  return imageUrl(image, PROFILE_SIZE_TOKENS[size]);
}
