import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/shell/page-container";
import { EpisodeList } from "@/features/shows/episode-list";
import { parseSeasonNumber } from "@/features/shows/parse-season-number";
import { parseShowId } from "@/features/shows/parse-show-id";
import { pluralize } from "@/features/shows/pluralize";
import { SeasonAdjacentNav } from "@/features/shows/season-adjacent-nav";
import { SeasonProgress } from "@/features/shows/season-progress";
import { SeasonSelect } from "@/features/shows/season-select";
import { SeasonWatchControl } from "@/features/shows/season-watch-control";
import { sortSeasons } from "@/features/shows/sort-seasons";
import type { Episode, SeasonDetails, ShowDetails } from "@/server/media/types";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import { TmdbError } from "@/server/tmdb/errors";
import { posterUrl } from "@/server/tmdb/images";
import { getSeasonDetails, getShowDetails } from "@/server/tmdb/queries";
import { getSeasonEpisodeWatchSummaries } from "@/server/tracking/episode-events";
import type { EpisodeWatchSummary } from "@/server/tracking/types";

// The season page is more functional than Show Details, not another
// cinematic hero (see docs/architecture.md): a compact identity strip —
// parent-show context link, season poster/name/scale/overview — then
// season-switcher navigation, then the episode list, which is this
// page's real reason to exist. Only ever fetches the one season the user
// opened; Show Details never eagerly fetches every season's episodes.
//
// Deliberately no route-level `loading.tsx` — see the equivalent comment
// on src/app/(app)/movies/[id]/page.tsx.
export default async function SeasonDetailsPage({
  params,
}: PageProps<"/shows/[id]/seasons/[seasonNumber]">) {
  const { id, seasonNumber: seasonNumberParam } = await params;
  const showId = parseShowId(id);
  const seasonNumber = parseSeasonNumber(seasonNumberParam);
  if (showId === null || seasonNumber === null) notFound();

  const { show, season, watchSummaries } = await fetchSeasonPageData(showId, seasonNumber);
  const { spoilerProtection } = await getCurrentUserPreferences();
  const poster = posterUrl(season.poster, "medium");
  const sortedSeasons = sortSeasons(show.seasons);
  const { airedCount, watchedCount } = summarizeSeasonProgress(season.episodes, watchSummaries);
  const airedEpisodes = season.episodes
    .filter((episode) => hasAired(episode.airDate))
    .map((episode) => ({ episodeNumber: episode.episodeNumber, episodeProviderId: episode.id }));

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/shows/${showId}` as Route}
              className="rounded-sm outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {show.title}
            </Link>{" "}
            <span aria-hidden="true">/</span> {season.title}
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="w-24 shrink-0 overflow-hidden rounded-md bg-surface-subtle sm:w-32">
              <div className="relative aspect-2/3">
                {poster ? (
                  <Image src={poster} alt="" fill sizes="128px" className="object-cover" />
                ) : null}
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <h1 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
                {season.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {pluralize(season.episodes.length, "episode")}
                {season.airDate ? ` · ${season.airDate.slice(0, 4)}` : ""}
              </p>
              {season.overview ? (
                <p className="max-w-prose text-sm leading-relaxed text-foreground/90">
                  {season.overview}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SeasonSelect
            showId={showId}
            sortedSeasons={sortedSeasons}
            currentSeasonNumber={seasonNumber}
          />
          <SeasonAdjacentNav
            showId={showId}
            sortedSeasons={sortedSeasons}
            currentSeasonNumber={seasonNumber}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SeasonProgress airedCount={airedCount} watchedCount={watchedCount} />
          <SeasonWatchControl
            showProviderId={showId}
            seasonNumber={seasonNumber}
            airedEpisodes={airedEpisodes}
            airedCount={airedCount}
            watchedCount={watchedCount}
          />
        </div>

        <EpisodeList
          showProviderId={showId}
          episodes={season.episodes}
          summaries={watchSummaries}
          spoilerProtection={spoilerProtection}
        />
      </div>
    </PageContainer>
  );
}

async function fetchSeasonPageData(
  showId: number,
  seasonNumber: number,
): Promise<{
  show: ShowDetails;
  season: SeasonDetails;
  watchSummaries: ReadonlyMap<number, EpisodeWatchSummary>;
}> {
  const [show, season, watchSummaries] = await Promise.all([
    fetchShow(showId),
    fetchSeason(showId, seasonNumber),
    getSeasonEpisodeWatchSummaries({ showProviderId: showId, seasonNumber }),
  ]);
  return { show, season, watchSummaries };
}

// Mirrors the aired-episode rule used in `episode-row.tsx` and
// `show-tracking-view.ts`: unaired episodes never count toward either the
// numerator or the denominator (see docs/tracking.md).
function hasAired(airDate: string | null): boolean {
  if (!airDate) return false;
  return new Date(`${airDate}T00:00:00Z`).getTime() <= Date.now();
}

function summarizeSeasonProgress(
  episodes: readonly Episode[],
  summaries: ReadonlyMap<number, EpisodeWatchSummary>,
): { airedCount: number; watchedCount: number } {
  const aired = episodes.filter((episode) => hasAired(episode.airDate));
  const watched = aired.filter((episode) => summaries.get(episode.episodeNumber)?.hasWatched);
  return { airedCount: aired.length, watchedCount: watched.length };
}

async function fetchShow(id: number): Promise<ShowDetails> {
  try {
    return await getShowDetails(id);
  } catch (error) {
    if (error instanceof TmdbError && error.kind === "not_found") {
      notFound();
    }
    throw error;
  }
}

async function fetchSeason(showId: number, seasonNumber: number): Promise<SeasonDetails> {
  try {
    return await getSeasonDetails(showId, seasonNumber);
  } catch (error) {
    if (error instanceof TmdbError && error.kind === "not_found") {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/shows/[id]/seasons/[seasonNumber]">): Promise<Metadata> {
  const { id, seasonNumber: seasonNumberParam } = await params;
  const showId = parseShowId(id);
  const seasonNumber = parseSeasonNumber(seasonNumberParam);
  if (showId === null || seasonNumber === null) return {};

  try {
    const [show, season] = await Promise.all([
      getShowDetails(showId),
      getSeasonDetails(showId, seasonNumber),
    ]);
    return { title: `${show.title} — ${season.title}` };
  } catch {
    return {};
  }
}
