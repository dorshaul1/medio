import { MediaCollectionRow } from "@/features/media/media-collection-row";
import { getPersonalStates } from "@/server/media/personal-state";
import { discoverMovies, discoverShows } from "@/server/tmdb/queries";

// Discover's own editorial moment — real, honestly-labeled collections
// derived from actual TMDB metadata (top-rated, newest, runtime), never
// invented judgments ("Hidden gems") or a duplicate of Home's own
// Trending/Popular/In-theaters rows (see docs/architecture.md, "Home vs
// Discover"). One row per media-type mode, not a wall of near-identical
// sections — see docs/search.md, "Discover editorial collections".
const ITEMS_PER_ROW = 12;
// A real, deliberately modest runtime ceiling — "a quick watch" without
// being so tight it excludes most normal-length films.
const SHORT_RUNTIME_MAX_MINUTES = 100;

function CollectionError({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">Couldn&apos;t load {label} right now.</p>;
}

export async function AcclaimedMoviesCollection() {
  try {
    const { items } = await discoverMovies({ sort: "top_rated" });
    const visible = items.slice(0, ITEMS_PER_ROW);
    const personalStates = await getPersonalStates(
      visible.map((item) => ({ mediaType: item.mediaType, mediaProviderId: item.id })),
    ).catch(() => new Map());
    return (
      <MediaCollectionRow
        id="discover-acclaimed-movies"
        title="Acclaimed movies"
        items={visible}
        personalStates={personalStates}
        size="large"
      />
    );
  } catch {
    return <CollectionError label="acclaimed movies" />;
  }
}

export async function ShortMoviesCollection() {
  try {
    const { items } = await discoverMovies({
      sort: "popular",
      runtimeLte: SHORT_RUNTIME_MAX_MINUTES,
    });
    const visible = items.slice(0, ITEMS_PER_ROW);
    const personalStates = await getPersonalStates(
      visible.map((item) => ({ mediaType: item.mediaType, mediaProviderId: item.id })),
    ).catch(() => new Map());
    return (
      <MediaCollectionRow
        id="discover-short-movies"
        title={`Under ${SHORT_RUNTIME_MAX_MINUTES} minutes`}
        items={visible}
        personalStates={personalStates}
      />
    );
  } catch {
    return <CollectionError label="short movies" />;
  }
}

export async function NewShowsCollection() {
  try {
    const { items } = await discoverShows({ sort: "newest" });
    const visible = items.slice(0, ITEMS_PER_ROW);
    const personalStates = await getPersonalStates(
      visible.map((item) => ({ mediaType: item.mediaType, mediaProviderId: item.id })),
    ).catch(() => new Map());
    return (
      <MediaCollectionRow
        id="discover-new-shows"
        title="New TV"
        items={visible}
        personalStates={personalStates}
        size="large"
      />
    );
  } catch {
    return <CollectionError label="new TV" />;
  }
}
