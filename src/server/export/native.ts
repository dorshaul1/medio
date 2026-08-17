import "server-only";
import { eq } from "drizzle-orm";
import { requireSession } from "@/server/auth/session";
import { db } from "@/server/db";
import { mediaComments } from "@/server/db/schema/opinions";
import { mediaPlanningItems } from "@/server/db/schema/planning";
import {
  episodeWatchEvents,
  movieWatchEvents,
  showTrackingState,
} from "@/server/db/schema/tracking";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import { getMovieDetails, getShowDetails } from "@/server/tmdb/queries";
import type { NativeExport, NativeExportPreferences } from "./types";
import { NATIVE_EXPORT_SCHEMA_VERSION } from "./types";

// Bounded concurrency for the title-hydration lookups below — one fetch
// per *distinct* title across the user's entire history, never one per
// row (see docs/data-portability.md, "Performance"). `getMovieDetails`/
// `getShowDetails` are already the normal 24h-cached "static details"
// path every other product surface uses — no export-specific caching.
const EXPORT_TITLE_CONCURRENCY = 8;

async function hydrateTitles<T>(
  ids: readonly number[],
  fetchOne: (id: number) => Promise<T>,
): Promise<ReadonlyMap<number, T | null>> {
  const distinct = [...new Set(ids)];
  const result = new Map<number, T | null>();
  for (let i = 0; i < distinct.length; i += EXPORT_TITLE_CONCURRENCY) {
    const chunk = distinct.slice(i, i + EXPORT_TITLE_CONCURRENCY);
    const details = await Promise.all(chunk.map((id) => fetchOne(id).catch(() => null)));
    chunk.forEach((id, index) => {
      result.set(id, details[index] ?? null);
    });
  }
  return result;
}

// Builds a complete, versioned MEDIO native export for the current user
// — see docs/data-portability.md, "Native export". Deliberately excludes
// auth credentials, secrets, session data, cached provider responses,
// and internal database row ids — every record's identity is the same
// external (provider, media type, provider id) triple the rest of this
// app already treats as canonical (see docs/media-provider.md).
// `includePreferences` defaults to false: media history is always the
// primary export value, preferences are opt-in (see
// docs/data-portability.md, "Preferences import").
export async function buildNativeExport(includePreferences = false): Promise<NativeExport> {
  const { user } = await requireSession();

  const [movies, episodes, planning, tracking, comments] = await Promise.all([
    db.select().from(movieWatchEvents).where(eq(movieWatchEvents.userId, user.id)),
    db.select().from(episodeWatchEvents).where(eq(episodeWatchEvents.userId, user.id)),
    db.select().from(mediaPlanningItems).where(eq(mediaPlanningItems.userId, user.id)),
    db.select().from(showTrackingState).where(eq(showTrackingState.userId, user.id)),
    db.select().from(mediaComments).where(eq(mediaComments.userId, user.id)),
  ]);

  const movieIds = [
    ...movies.map((row) => row.movieProviderId),
    ...planning.filter((row) => row.mediaType === "movie").map((row) => row.mediaProviderId),
    ...comments.filter((row) => row.mediaType === "movie").map((row) => row.mediaProviderId),
  ];
  const showIds = [
    ...episodes.map((row) => row.showProviderId),
    ...tracking.map((row) => row.showProviderId),
    ...planning.filter((row) => row.mediaType === "show").map((row) => row.mediaProviderId),
    ...comments.filter((row) => row.mediaType === "show").map((row) => row.mediaProviderId),
  ];

  const [movieTitles, showTitles] = await Promise.all([
    hydrateTitles(movieIds, getMovieDetails),
    hydrateTitles(showIds, getShowDetails),
  ]);

  const movieTitle = (id: number) => movieTitles.get(id)?.title ?? "";
  const movieYear = (id: number) => movieTitles.get(id)?.releaseYear ?? null;
  const showTitle = (id: number) => showTitles.get(id)?.title ?? "";
  const showYear = (id: number) => showTitles.get(id)?.firstAirYear ?? null;
  const mediaTitle = (mediaType: "movie" | "show", id: number) =>
    mediaType === "movie" ? movieTitle(id) : showTitle(id);
  const mediaYear = (mediaType: "movie" | "show", id: number) =>
    mediaType === "movie" ? movieYear(id) : showYear(id);

  let preferences: NativeExportPreferences | null = null;
  if (includePreferences) {
    const prefs = await getCurrentUserPreferences();
    preferences = { ...prefs };
  }

  return {
    schemaVersion: NATIVE_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      movieWatchEvents: movies.map((row) => ({
        movieProviderId: row.movieProviderId,
        title: movieTitle(row.movieProviderId),
        year: movieYear(row.movieProviderId),
        watchedAt: row.watchedAt.toISOString(),
      })),
      episodeWatchEvents: episodes.map((row) => ({
        showProviderId: row.showProviderId,
        showTitle: showTitle(row.showProviderId),
        seasonNumber: row.seasonNumber,
        episodeNumber: row.episodeNumber,
        episodeProviderId: row.episodeProviderId,
        watchedAt: row.watchedAt.toISOString(),
      })),
      planningItems: planning.map((row) => ({
        mediaType: row.mediaType,
        mediaProviderId: row.mediaProviderId,
        title: mediaTitle(row.mediaType, row.mediaProviderId),
        year: mediaYear(row.mediaType, row.mediaProviderId),
        intent: row.intent,
      })),
      showTrackingState: tracking.map((row) => ({
        showProviderId: row.showProviderId,
        title: showTitle(row.showProviderId),
        status: row.status,
      })),
      comments: comments.map((row) => ({
        mediaType: row.mediaType,
        mediaProviderId: row.mediaProviderId,
        title: mediaTitle(row.mediaType, row.mediaProviderId),
        year: mediaYear(row.mediaType, row.mediaProviderId),
        content: row.content,
      })),
      preferences,
    },
  };
}
