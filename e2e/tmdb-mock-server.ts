// A deterministic stand-in for TMDB, used only by Discover/search E2E
// coverage. Server Components fetch TMDB directly (no browser-visible HTTP
// call), so Playwright's usual page.route() network interception can't
// reach it — this is a real local HTTP server instead, using only Node's
// built-in http module (no mocking dependency). Wired in via
// TMDB_API_BASE_URL_OVERRIDE — see src/server/tmdb/client.ts and
// playwright.config.ts.
import { createServer, type Server } from "node:http";

const MOVIE = {
  id: 550,
  title: "Fight Club",
  original_title: "Fight Club",
  overview:
    "An insomniac office worker and a devil-may-care soap maker form an underground fight club.",
  release_date: "1999-10-15",
  poster_path: "/movie-fixture.jpg",
  backdrop_path: null,
  vote_average: 8.4,
  vote_count: 26000,
  genre_ids: [18],
  adult: false,
};

const SHOW = {
  id: 1399,
  name: "Winter's Watch",
  original_name: "Winter's Watch",
  overview: "Noble families fight for control of a fictional land.",
  first_air_date: "2011-04-17",
  poster_path: "/show-fixture.jpg",
  backdrop_path: null,
  vote_average: 8.1,
  vote_count: 21000,
  genre_ids: [18],
  adult: false,
};

// A second title, distinct from MOVIE/SHOW — used as genre-browse page 2,
// so pagination has something deterministic to actually show as changed.
const MOVIE_PAGE_2 = { ...MOVIE, id: 551, title: "The Second Reel" };
const SHOW_PAGE_2 = {
  ...SHOW,
  id: 1400,
  name: "Second Season Watch",
  original_name: "Second Season Watch",
};

// A third title, used only by e2e/library.spec.ts (planning/Library
// coverage) — movie/show tracking coverage (e2e/tracking.spec.ts) already
// mutates MOVIE/MOVIE_PAGE_2's watch history and SHOW's tracking state, so
// Library's own planning-flow tests need fixtures those specs never touch
// to run safely under full parallelism.
const MOVIE_PAGE_3 = { ...MOVIE, id: 552, title: "The Third Reel" };

// Fixtures used only by e2e/home.spec.ts (personalized Home coverage) —
// dedicated ids for the same cross-file-parallelism reason as
// MOVIE_PAGE_3 above.
const MOVIE_PAGE_4 = { ...MOVIE, id: 553, title: "The Fourth Reel", release_date: "2099-01-01" };
const SHOW_PAGE_3 = {
  ...SHOW,
  id: 1401,
  name: "Third Watch",
  original_name: "Third Watch",
};
const SHOW_PAGE_4 = {
  ...SHOW,
  id: 1402,
  name: "Fourth Watch",
  original_name: "Fourth Watch",
};

// Fixtures used only by e2e/library.spec.ts's own quick-tracking
// coverage (Library's next-episode Mark Watched / Resume / planned-movie
// Mark Watched actions) — dedicated ids for the same cross-file-
// parallelism reason as MOVIE_PAGE_3 above. SHOW_PAGE_5 has two aired
// episodes in one season, deliberately more than SHOW_PAGE_2's one — a
// single-episode show reaches Caught Up the moment it's marked watched,
// leaving nothing to demonstrate an in-progress "next episode" quick
// action against.
const MOVIE_PAGE_5 = { ...MOVIE, id: 554, title: "The Fifth Reel" };
const SHOW_PAGE_5 = {
  ...SHOW,
  id: 1403,
  name: "Fifth Watch",
  original_name: "Fifth Watch",
};

// Used only by e2e/season-details.spec.ts's "next episode emphasis"
// coverage, which mutates real tracking state (marks then unmarks an
// episode) — SHOW (1399) is read-only everywhere else in that file, and
// e2e/tracking.spec.ts separately mutates SHOW's own tracking state, so
// this needs its own fixture to run safely under full parallelism.
const SHOW_PAGE_7 = {
  ...SHOW,
  id: 1405,
  name: "Seventh Watch",
  original_name: "Seventh Watch",
};

// Used only by e2e/diary.spec.ts — dedicated fixtures for the same
// cross-file-parallelism reason as MOVIE_PAGE_3 above. SHOW_PAGE_8 has
// two aired episodes in season 1, so a rewatch of the first episode
// (Diary's own rewatch-ordinal coverage) has a second, distinct episode
// available too.
const MOVIE_PAGE_6 = { ...MOVIE, id: 555, title: "The Sixth Reel" };
const SHOW_PAGE_8 = {
  ...SHOW,
  id: 1404,
  name: "Eighth Watch",
  original_name: "Eighth Watch",
};
// A second movie fixture for diary.spec.ts's mobile-viewport coverage —
// dedicated so it never races the desktop tests' own mutations of
// MOVIE_PAGE_6 across parallel workers.
const MOVIE_PAGE_7 = { ...MOVIE, id: 556, title: "The Seventh Reel" };

// Used only by e2e/taste.spec.ts — dedicated ids for the same cross-file-
// parallelism reason as MOVIE_PAGE_3 above. Both Taste Reel One/Two carry
// real Drama genre data and share Fight Club's own real director (David
// Fincher, 7467) and lead actor (Edward Norton, 819) — reusing those two
// existing Person fixtures (already registered above) rather than adding
// a third, so rating both movies is enough evidence for a Favorite
// Director *and* Favorite Actor insight without a new Person fixture.
// Taste Reel Three deliberately has no genre and no credits route (the
// same "missing optional data" pattern as MOVIE_PAGE_2) — its only job is
// being a third distinct watched title so genre insights clear Taste's
// minimum-total-title threshold without adding genre noise of its own.
const MOVIE_TASTE_1 = { ...MOVIE, id: 560, title: "Taste Reel One" };
const MOVIE_TASTE_2 = { ...MOVIE, id: 561, title: "Taste Reel Two" };
const MOVIE_TASTE_3 = { ...MOVIE, id: 562, title: "Taste Reel Three" };

// Used only by e2e/settings.spec.ts — dedicated ids for the same cross-
// file-parallelism reason as MOVIE_PAGE_3 above. MOVIE_SETTINGS_1 is
// used for the Default Save destination flow (an otherwise-untouched
// unwatched movie); SHOW_SETTINGS_1 is used for the Spoiler protection
// flow (two aired episodes, so one can stay watched and one unwatched).
const MOVIE_SETTINGS_1 = { ...MOVIE, id: 570, title: "Settings Reel One" };
const SHOW_SETTINGS_1 = {
  ...SHOW,
  id: 590,
  name: "Settings Watch",
  original_name: "Settings Watch",
};

// Used only by e2e/calendar.spec.ts — dedicated ids for the same cross-
// file-parallelism reason as MOVIE_PAGE_3 above. Calendar's bucketing
// (Today/Tomorrow/This week) is relative to the real calendar date, so
// these air/release dates are computed once at server startup rather
// than hardcoded — a fixed literal would eventually stop landing in the
// bucket its test expects as real time passes.
function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const CALENDAR_TODAY = isoDaysFromNow(0);
const CALENDAR_IN_5_DAYS = isoDaysFromNow(5);
const CALENDAR_IN_3_DAYS = isoDaysFromNow(3);
const CALENDAR_IN_2_DAYS = isoDaysFromNow(2);

// Ninth Watch: actively tracked. Episode 1 aired long ago (marked
// watched by the test); Episode 2 airs today — once Episode 1 is
// watched, Episode 2 is already the show's next-unwatched-*aired*
// episode, so Calendar's "New Episode Available" for it appears
// automatically, with no separate status change (the Caught Up → New
// transition — see docs/calendar.md). Episode 3 (`next_episode_to_air`)
// airs in 5 days — a distinct, still-upcoming event in a different
// bucket, and this fixture's spoiler-protection coverage target.
const SHOW_CALENDAR_1 = {
  ...SHOW,
  id: 1600,
  name: "Ninth Watch",
  original_name: "Ninth Watch",
};

// Tenth Watch: saved to Backlog, never tracked — only its season
// premiere (in 3 days) should ever appear on Calendar.
const SHOW_CALENDAR_2 = {
  ...SHOW,
  id: 1601,
  name: "Tenth Watch",
  original_name: "Tenth Watch",
};

// Eighth Reel: saved to Watchlist, releasing in 2 days.
const MOVIE_CALENDAR_1 = { ...MOVIE, id: 600, title: "The Eighth Reel" };

// The exact curated genre sets from
// src/features/discover/genre-selection.ts, with plausible (but made up —
// this is a fixture, not real TMDB data) IDs.
const MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 53, name: "Thriller" },
  { id: 27, name: "Horror" },
  { id: 878, name: "Science Fiction" },
  { id: 10749, name: "Romance" },
  { id: 16, name: "Animation" },
  { id: 99, name: "Documentary" },
];

const SHOW_GENRES = [
  { id: 18, name: "Drama" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 10764, name: "Reality" },
  { id: 16, name: "Animation" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 9648, name: "Mystery" },
  { id: 10759, name: "Action & Adventure" },
];

// Any search query containing this triggers a deterministic zero-result
// response, so the E2E suite can exercise the empty state without relying
// on a real title that genuinely doesn't exist.
const NO_RESULTS_MARKER = "zzznoresultszzz";

// Used only by e2e/data-portability.spec.ts — a search-endpoint fixture
// distinct from MOVIE/SHOW (which every other spec's search coverage
// already assumes is what any query returns), so importing this title
// resolves to a real, distinguishable match rather than colliding with
// Fight Club. `searchResponse` below checks this map first (exact,
// case-insensitive title) and only falls back to the caller's own
// default item — the same "return MOVIE/SHOW no matter the query"
// behavior every other spec already relies on — when no dedicated
// fixture matches, so this is purely additive.
const MOVIE_IMPORT_1 = { ...MOVIE, id: 620, title: "The Ninth Reel", release_date: "2019-05-01" };
const TITLE_SEARCH_FIXTURES: Record<string, Record<string, unknown>> = {
  "the ninth reel": MOVIE_IMPORT_1,
};

function searchResponse(defaultItem: Record<string, unknown>, query: string) {
  const empty = query.toLowerCase().includes(NO_RESULTS_MARKER);
  if (empty) return { page: 1, total_pages: 0, total_results: 0, results: [] };
  const dedicated = TITLE_SEARCH_FIXTURES[query.trim().toLowerCase()];
  return { page: 1, total_pages: 1, total_results: 1, results: [dedicated ?? defaultItem] };
}

// Genre browsing ignores with_genres/sort_by for determinism — only
// `page` varies the response, which is all pagination E2E coverage needs.
function discoverResponse(
  pageOneItem: Record<string, unknown>,
  pageTwoItem: Record<string, unknown>,
  url: URL,
) {
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
  return {
    page,
    total_pages: 2,
    total_results: 2,
    results: [page === 1 ? pageOneItem : pageTwoItem],
  };
}

const ROUTES: Record<string, (url: URL) => unknown> = {
  "/3/trending/movie/day": () => ({ page: 1, total_pages: 1, total_results: 1, results: [MOVIE] }),
  "/3/trending/tv/day": () => ({ page: 1, total_pages: 1, total_results: 1, results: [SHOW] }),
  "/3/movie/popular": () => ({ page: 1, total_pages: 1, total_results: 1, results: [MOVIE] }),
  "/3/tv/popular": () => ({ page: 1, total_pages: 1, total_results: 1, results: [SHOW] }),
  "/3/movie/now_playing": () => ({
    dates: { minimum: "2026-01-01", maximum: "2026-12-31" },
    page: 1,
    total_pages: 1,
    total_results: 1,
    results: [MOVIE],
  }),
  "/3/genre/movie/list": () => ({ genres: MOVIE_GENRES }),
  "/3/genre/tv/list": () => ({ genres: SHOW_GENRES }),
  "/3/discover/movie": (url) => discoverResponse(MOVIE, MOVIE_PAGE_2, url),
  "/3/discover/tv": (url) => discoverResponse(SHOW, SHOW_PAGE_2, url),
  "/3/search/movie": (url) => searchResponse(MOVIE, url.searchParams.get("query") ?? ""),
  "/3/search/tv": (url) => searchResponse(SHOW, url.searchParams.get("query") ?? ""),
  // Movie/show details — used by the /movies/[id] and /shows/[id] pages
  // when an E2E test clicks through from a poster.
  [`/3/movie/${MOVIE.id}`]: () => ({
    ...MOVIE,
    tagline: "Mischief. Mayhem. Soap.",
    backdrop_path: "/movie-backdrop-fixture.jpg",
    runtime: 139,
    status: "Released",
    genres: [{ id: 18, name: "Drama" }],
    original_language: "en",
    production_countries: [{ iso_3166_1: "US", name: "United States of America" }],
    belongs_to_collection: {
      id: 900,
      name: "Fixture Collection",
      poster_path: "/collection-poster-fixture.jpg",
      backdrop_path: "/collection-backdrop-fixture.jpg",
    },
  }),
  "/3/collection/900": () => ({
    id: 900,
    name: "Fixture Collection",
    parts: [MOVIE, MOVIE_PAGE_2],
  }),
  [`/3/movie/${MOVIE.id}/credits`]: () => ({
    cast: [
      {
        id: 819,
        name: "Edward Norton",
        character: "The Narrator",
        profile_path: "/norton-fixture.jpg",
        order: 0,
      },
      { id: 287, name: "Brad Pitt", character: "Tyler Durden", profile_path: null, order: 1 },
    ],
    crew: [{ id: 7467, name: "David Fincher", job: "Director", department: "Directing" }],
  }),
  // People fixtures (e2e/people.spec.ts) — reachable both directly
  // (page.goto("/people/{id}")) and by clicking through from Fight
  // Club's/Winter's Watch's cast/crew above, so both discovery paths
  // (media page → person, direct link) exercise the same real fixtures.
  "/3/person/819": () => ({
    id: 819,
    name: "Edward Norton",
    biography: "An American actor known for The Narrator in Fight Club.",
    birthday: "1969-08-18",
    deathday: null,
    place_of_birth: "Boston, Massachusetts, USA",
    profile_path: "/norton-fixture.jpg",
    known_for_department: "Acting",
  }),
  "/3/person/819/combined_credits": () => ({
    cast: [
      {
        id: MOVIE.id,
        media_type: "movie",
        title: MOVIE.title,
        release_date: MOVIE.release_date,
        poster_path: MOVIE.poster_path,
        character: "The Narrator",
        vote_count: MOVIE.vote_count,
      },
    ],
    crew: [],
  }),
  "/3/person/7467": () => ({
    id: 7467,
    name: "David Fincher",
    biography: "An American film director known for dark, stylized thrillers.",
    birthday: "1962-08-28",
    deathday: null,
    place_of_birth: "Denver, Colorado, USA",
    profile_path: "/fincher-fixture.jpg",
    known_for_department: "Directing",
  }),
  "/3/person/7467/combined_credits": () => ({
    cast: [],
    crew: [
      {
        id: MOVIE.id,
        media_type: "movie",
        title: MOVIE.title,
        release_date: MOVIE.release_date,
        poster_path: MOVIE.poster_path,
        job: "Director",
        department: "Directing",
        vote_count: MOVIE.vote_count,
      },
    ],
  }),
  // A sparse profile — no biography, no photo — reached via Winter's
  // Watch's "Created by" link. Doubles as the "missing biography"/
  // "missing profile image" edge-case coverage.
  "/3/person/9813": () => ({
    id: 9813,
    name: "Fixture Creator",
    biography: "",
    birthday: null,
    deathday: null,
    place_of_birth: null,
    profile_path: null,
    known_for_department: "Writing",
  }),
  "/3/person/9813/combined_credits": () => ({
    cast: [],
    crew: [
      {
        id: SHOW.id,
        media_type: "tv",
        name: SHOW.name,
        first_air_date: SHOW.first_air_date,
        poster_path: SHOW.poster_path,
        job: "Executive Producer",
        department: "Production",
        vote_count: SHOW.vote_count,
      },
    ],
  }),
  // A mixed actor/director career with a long acting filmography (13
  // filler credits beyond the real MOVIE/SHOW ones) — exercises "both
  // professional contexts are understandable" and the bounded "Show more"
  // reveal, reached only by direct navigation (not linked from any media
  // page — a person doesn't need to be click-reachable to be a valid
  // fixture).
  "/3/person/3001": () => ({
    id: 3001,
    name: "Fixture Auteur",
    biography: "A filmmaker who both directs and acts.",
    birthday: "1975-03-12",
    deathday: null,
    place_of_birth: "Los Angeles, California, USA",
    profile_path: "/auteur-fixture.jpg",
    known_for_department: "Acting",
  }),
  "/3/person/3001/combined_credits": () => ({
    cast: [
      {
        id: SHOW.id,
        media_type: "tv",
        name: SHOW.name,
        first_air_date: SHOW.first_air_date,
        poster_path: SHOW.poster_path,
        character: "Recurring Role",
        episode_count: 4,
        vote_count: SHOW.vote_count,
      },
      ...Array.from({ length: 13 }, (_, i) => ({
        id: 9000 + i,
        media_type: i % 2 === 0 ? "movie" : "tv",
        ...(i % 2 === 0
          ? { title: `Filler Feature ${i}`, release_date: `${2010 + i}-01-01` }
          : { name: `Filler Series ${i}`, first_air_date: `${2010 + i}-01-01` }),
        poster_path: null,
        character: "Supporting Role",
        vote_count: 10 - i,
      })),
    ],
    crew: [
      {
        id: MOVIE.id,
        media_type: "movie",
        title: MOVIE.title,
        release_date: MOVIE.release_date,
        poster_path: MOVIE.poster_path,
        job: "Director",
        department: "Directing",
        vote_count: MOVIE.vote_count,
      },
      {
        id: MOVIE_PAGE_2.id,
        media_type: "movie",
        title: MOVIE_PAGE_2.title,
        release_date: MOVIE_PAGE_2.release_date,
        poster_path: MOVIE_PAGE_2.poster_path,
        job: "Director",
        department: "Directing",
        vote_count: 5,
      },
    ],
  }),
  [`/3/movie/${MOVIE.id}/videos`]: () => ({
    results: [
      {
        id: "1",
        key: "SUXWAEX2jlg",
        name: "Fight Club | Trailer",
        site: "YouTube",
        type: "Trailer",
        official: true,
      },
    ],
  }),
  [`/3/movie/${MOVIE.id}/recommendations`]: () => ({
    page: 1,
    total_pages: 1,
    total_results: 1,
    results: [MOVIE_PAGE_2],
  }),
  // A second movie details fixture with no credits/videos/recommendations
  // routes registered at all — exercises "missing optional data doesn't
  // break the layout" without a special-cased flag anywhere.
  [`/3/movie/${MOVIE_PAGE_2.id}`]: () => ({
    ...MOVIE_PAGE_2,
    tagline: "",
    runtime: 0,
    status: "Released",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  [`/3/tv/${SHOW.id}`]: () => ({
    ...SHOW,
    tagline: "Every legend has a beginning.",
    last_air_date: "2019-05-19",
    status: "Ended",
    genres: [{ id: 18, name: "Drama" }],
    original_language: "en",
    number_of_seasons: 2,
    number_of_episodes: 12,
    episode_run_time: [55],
    created_by: [{ id: 9813, name: "Fixture Creator" }],
    seasons: [
      {
        id: 3624,
        season_number: 0,
        name: "Specials",
        overview: "",
        air_date: null,
        episode_count: 2,
        poster_path: null,
      },
      {
        id: 3625,
        season_number: 1,
        name: "Season 1",
        overview: "The first season.",
        air_date: "2011-04-17",
        episode_count: 10,
        poster_path: "/season1-fixture.jpg",
      },
      {
        id: 3626,
        season_number: 2,
        name: "Season 2",
        overview: "The second season.",
        air_date: "2012-04-01",
        episode_count: 2,
        poster_path: "/season2-fixture.jpg",
      },
    ],
  }),
  [`/3/tv/${SHOW.id}/aggregate_credits`]: () => ({
    cast: [
      {
        id: 22970,
        name: "Fixture Actor",
        profile_path: "/actor-fixture.jpg",
        roles: [{ character: "Fixture Character", episode_count: 12 }],
        order: 0,
      },
    ],
  }),
  [`/3/tv/${SHOW.id}/videos`]: () => ({
    results: [
      {
        id: "1",
        key: "SUXWAEX2jlg",
        name: "Winter's Watch | Trailer",
        site: "YouTube",
        type: "Trailer",
        official: true,
      },
    ],
  }),
  [`/3/tv/${SHOW.id}/recommendations`]: () => ({
    page: 1,
    total_pages: 1,
    total_results: 1,
    results: [SHOW_PAGE_2],
  }),
  [`/3/tv/${SHOW.id}/season/1`]: () => ({
    id: 3625,
    season_number: 1,
    name: "Season 1",
    overview: "The first season.",
    air_date: "2011-04-17",
    poster_path: "/season1-fixture.jpg",
    episodes: [
      {
        id: 63056,
        episode_number: 1,
        season_number: 1,
        name: "Winter Is Coming",
        overview: "Ned Stark is torn between his family and his duty.",
        runtime: 62,
        air_date: "2011-04-17",
        still_path: "/episode1-fixture.jpg",
        vote_average: 8.1,
      },
      {
        id: 63057,
        episode_number: 2,
        season_number: 1,
        name: "The Kingsroad",
        // Missing overview/still/runtime on purpose — exercises the
        // "missing episode data doesn't break the layout" path.
        overview: "",
        runtime: 0,
        air_date: null,
        still_path: null,
        vote_average: 0,
      },
    ],
  }),
  // Season 2 is deliberately mostly empty and includes a far-future air
  // date — exercises Specials adjacency and "upcoming episode" rendering.
  [`/3/tv/${SHOW.id}/season/2`]: () => ({
    id: 3626,
    season_number: 2,
    name: "Season 2",
    overview: "The second season.",
    air_date: "2012-04-01",
    poster_path: "/season2-fixture.jpg",
    episodes: [
      {
        id: 63058,
        episode_number: 1,
        season_number: 2,
        name: "The North Remembers",
        overview: "A new season begins.",
        runtime: 53,
        air_date: "2012-04-01",
        still_path: "/episode2-fixture.jpg",
        vote_average: 8.0,
      },
      {
        id: 63059,
        episode_number: 2,
        season_number: 2,
        name: "A Future Episode",
        overview: "Not yet aired.",
        runtime: null,
        air_date: "2099-01-01",
        still_path: null,
        vote_average: 0,
      },
    ],
  }),
  [`/3/tv/${SHOW.id}/season/0`]: () => ({
    id: 3624,
    season_number: 0,
    name: "Specials",
    overview: "",
    air_date: null,
    poster_path: null,
    episodes: [
      {
        id: 63060,
        episode_number: 1,
        season_number: 0,
        name: "Behind the Watch",
        overview: "A behind-the-scenes look.",
        runtime: 20,
        air_date: "2011-05-01",
        still_path: null,
        vote_average: 0,
      },
    ],
  }),
  // A second show fixture with no credits/videos/recommendations/extra
  // seasons registered at all — exercises "missing optional data doesn't
  // break the layout" without a special-cased flag anywhere, same
  // reasoning as MOVIE_PAGE_2 for movies.
  [`/3/tv/${SHOW_PAGE_2.id}`]: () => ({
    ...SHOW_PAGE_2,
    tagline: "",
    last_air_date: null,
    status: "Returning Series",
    genres: [],
    original_language: "en",
    number_of_seasons: 1,
    number_of_episodes: 1,
    episode_run_time: [],
    created_by: [],
    seasons: [
      {
        id: 9001,
        season_number: 1,
        name: "Season 1",
        overview: "",
        air_date: "2020-01-01",
        episode_count: 1,
        poster_path: null,
      },
    ],
  }),
  [`/3/movie/${MOVIE_PAGE_3.id}`]: () => ({
    ...MOVIE_PAGE_3,
    tagline: "",
    runtime: 0,
    status: "Released",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  [`/3/tv/${SHOW_PAGE_2.id}/season/1`]: () => ({
    id: 9001,
    season_number: 1,
    name: "Season 1",
    overview: "",
    air_date: "2020-01-01",
    poster_path: null,
    episodes: [
      {
        id: 90011,
        episode_number: 1,
        season_number: 1,
        name: "Pilot",
        overview: "",
        runtime: null,
        air_date: "2020-01-01",
        still_path: null,
        vote_average: 0,
      },
    ],
  }),
  // e2e/home.spec.ts fixtures only — see the comment by MOVIE_PAGE_4 above.
  [`/3/movie/${MOVIE_PAGE_4.id}`]: () => ({
    ...MOVIE_PAGE_4,
    tagline: "",
    runtime: 0,
    status: "Released",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  [`/3/tv/${SHOW_PAGE_3.id}`]: () => ({
    ...SHOW_PAGE_3,
    tagline: "",
    last_air_date: "2020-01-08",
    status: "Ended",
    genres: [],
    original_language: "en",
    number_of_seasons: 1,
    number_of_episodes: 2,
    episode_run_time: [],
    created_by: [],
    seasons: [
      {
        id: 14011,
        season_number: 1,
        name: "Season 1",
        overview: "",
        air_date: "2020-01-01",
        episode_count: 2,
        poster_path: null,
      },
    ],
  }),
  [`/3/tv/${SHOW_PAGE_3.id}/season/1`]: () => ({
    id: 14011,
    season_number: 1,
    name: "Season 1",
    overview: "",
    air_date: "2020-01-01",
    poster_path: null,
    episodes: [1, 2].map((n) => ({
      id: 140110 + n,
      episode_number: n,
      season_number: 1,
      name: `Episode ${n}`,
      overview: "",
      runtime: 40,
      air_date: n === 1 ? "2020-01-01" : "2020-01-08",
      still_path: null,
      vote_average: 0,
    })),
  }),
  [`/3/tv/${SHOW_PAGE_4.id}`]: () => ({
    ...SHOW_PAGE_4,
    tagline: "",
    last_air_date: "2020-02-05",
    status: "Ended",
    genres: [],
    original_language: "en",
    number_of_seasons: 1,
    number_of_episodes: 6,
    episode_run_time: [],
    created_by: [],
    seasons: [
      {
        id: 14021,
        season_number: 1,
        name: "Season 1",
        overview: "",
        air_date: "2020-01-01",
        episode_count: 6,
        poster_path: null,
      },
    ],
  }),
  [`/3/tv/${SHOW_PAGE_4.id}/season/1`]: () => ({
    id: 14021,
    season_number: 1,
    name: "Season 1",
    overview: "",
    air_date: "2020-01-01",
    poster_path: null,
    episodes: Array.from({ length: 6 }, (_, i) => {
      const n = i + 1;
      return {
        id: 140210 + n,
        episode_number: n,
        season_number: 1,
        name: `Episode ${n}`,
        overview: "",
        runtime: 40,
        air_date: `2020-01-${String(n).padStart(2, "0")}`,
        still_path: null,
        vote_average: 0,
      };
    }),
  }),
  [`/3/movie/${MOVIE_PAGE_5.id}`]: () => ({
    ...MOVIE_PAGE_5,
    tagline: "",
    runtime: 0,
    status: "Released",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  [`/3/tv/${SHOW_PAGE_5.id}`]: () => ({
    ...SHOW_PAGE_5,
    tagline: "",
    last_air_date: "2020-01-08",
    status: "Returning Series",
    genres: [],
    original_language: "en",
    number_of_seasons: 1,
    number_of_episodes: 2,
    episode_run_time: [],
    created_by: [],
    seasons: [
      {
        id: 15031,
        season_number: 1,
        name: "Season 1",
        overview: "",
        air_date: "2020-01-01",
        episode_count: 2,
        poster_path: null,
      },
    ],
  }),
  [`/3/tv/${SHOW_PAGE_5.id}/season/1`]: () => ({
    id: 15031,
    season_number: 1,
    name: "Season 1",
    overview: "",
    air_date: "2020-01-01",
    poster_path: null,
    episodes: [1, 2].map((n) => ({
      id: 150310 + n,
      episode_number: n,
      season_number: 1,
      name: `Episode ${n}`,
      overview: "",
      runtime: 40,
      air_date: n === 1 ? "2020-01-01" : "2020-01-08",
      still_path: null,
      vote_average: 0,
    })),
  }),
  [`/3/tv/${SHOW_PAGE_7.id}`]: () => ({
    ...SHOW_PAGE_7,
    tagline: "",
    last_air_date: "2020-01-08",
    status: "Returning Series",
    genres: [],
    original_language: "en",
    number_of_seasons: 1,
    number_of_episodes: 2,
    episode_run_time: [],
    created_by: [],
    seasons: [
      {
        id: 17051,
        season_number: 1,
        name: "Season 1",
        overview: "",
        air_date: "2020-01-01",
        episode_count: 2,
        poster_path: null,
      },
    ],
  }),
  [`/3/tv/${SHOW_PAGE_7.id}/season/1`]: () => ({
    id: 17051,
    season_number: 1,
    name: "Season 1",
    overview: "",
    air_date: "2020-01-01",
    poster_path: null,
    episodes: [
      {
        id: 170511,
        episode_number: 1,
        season_number: 1,
        name: "Pilot",
        overview: "",
        runtime: 40,
        air_date: "2020-01-01",
        still_path: null,
        vote_average: 0,
      },
      {
        id: 170512,
        episode_number: 2,
        season_number: 1,
        name: "Second Episode",
        overview: "",
        runtime: 40,
        air_date: "2020-01-08",
        still_path: null,
        vote_average: 0,
      },
    ],
  }),
  // e2e/diary.spec.ts fixtures only — see the comment by MOVIE_PAGE_6/
  // SHOW_PAGE_8 above.
  [`/3/movie/${MOVIE_PAGE_6.id}`]: () => ({
    ...MOVIE_PAGE_6,
    tagline: "",
    runtime: 0,
    status: "Released",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  [`/3/movie/${MOVIE_PAGE_7.id}`]: () => ({
    ...MOVIE_PAGE_7,
    tagline: "",
    runtime: 0,
    status: "Released",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  [`/3/tv/${SHOW_PAGE_8.id}`]: () => ({
    ...SHOW_PAGE_8,
    tagline: "",
    last_air_date: "2020-01-08",
    status: "Returning Series",
    genres: [],
    original_language: "en",
    number_of_seasons: 1,
    number_of_episodes: 2,
    episode_run_time: [],
    created_by: [],
    seasons: [
      {
        id: 14041,
        season_number: 1,
        name: "Season 1",
        overview: "",
        air_date: "2020-01-01",
        episode_count: 2,
        poster_path: null,
      },
    ],
  }),
  [`/3/tv/${SHOW_PAGE_8.id}/season/1`]: () => ({
    id: 14041,
    season_number: 1,
    name: "Season 1",
    overview: "",
    air_date: "2020-01-01",
    poster_path: null,
    episodes: [1, 2].map((n) => ({
      id: 140410 + n,
      episode_number: n,
      season_number: 1,
      name: `Episode ${n}`,
      overview: "",
      runtime: 40,
      air_date: n === 1 ? "2020-01-01" : "2020-01-08",
      still_path: null,
      vote_average: 0,
    })),
  }),
  // e2e/taste.spec.ts fixtures only — see the comment by MOVIE_TASTE_1
  // above. Both carry real Drama genre data and the same director/lead
  // actor credits, so rating both is enough evidence for Favorite
  // Director/Actor insights.
  [`/3/movie/${MOVIE_TASTE_1.id}`]: () => ({
    ...MOVIE_TASTE_1,
    tagline: "",
    runtime: 118,
    status: "Released",
    genres: [{ id: 18, name: "Drama" }],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  [`/3/movie/${MOVIE_TASTE_1.id}/credits`]: () => ({
    cast: [{ id: 819, name: "Edward Norton", character: "Lead", profile_path: null, order: 0 }],
    crew: [{ id: 7467, name: "David Fincher", job: "Director", department: "Directing" }],
  }),
  [`/3/movie/${MOVIE_TASTE_2.id}`]: () => ({
    ...MOVIE_TASTE_2,
    tagline: "",
    runtime: 104,
    status: "Released",
    genres: [{ id: 18, name: "Drama" }],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  [`/3/movie/${MOVIE_TASTE_2.id}/credits`]: () => ({
    cast: [{ id: 819, name: "Edward Norton", character: "Lead", profile_path: null, order: 0 }],
    crew: [{ id: 7467, name: "David Fincher", job: "Director", department: "Directing" }],
  }),
  // No genre, no credits route — deliberately mirrors MOVIE_PAGE_2's
  // "missing optional data" pattern; this title's only job is being a
  // third distinct watched title (see the comment by MOVIE_TASTE_1).
  [`/3/movie/${MOVIE_TASTE_3.id}`]: () => ({
    ...MOVIE_TASTE_3,
    tagline: "",
    runtime: 0,
    status: "Released",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  // e2e/settings.spec.ts fixtures only — see the comment by
  // MOVIE_SETTINGS_1 above.
  [`/3/movie/${MOVIE_SETTINGS_1.id}`]: () => ({
    ...MOVIE_SETTINGS_1,
    tagline: "",
    runtime: 0,
    status: "Released",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  // e2e/data-portability.spec.ts fixture only — see the comment by
  // MOVIE_IMPORT_1 above.
  [`/3/movie/${MOVIE_IMPORT_1.id}`]: () => ({
    ...MOVIE_IMPORT_1,
    tagline: "",
    runtime: 100,
    status: "Released",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
  [`/3/tv/${SHOW_SETTINGS_1.id}`]: () => ({
    ...SHOW_SETTINGS_1,
    tagline: "",
    last_air_date: "2020-01-08",
    status: "Ended",
    genres: [],
    original_language: "en",
    number_of_seasons: 1,
    number_of_episodes: 2,
    episode_run_time: [],
    created_by: [],
    seasons: [
      {
        id: 59011,
        season_number: 1,
        name: "Season 1",
        overview: "",
        air_date: "2020-01-01",
        episode_count: 2,
        poster_path: null,
      },
    ],
  }),
  [`/3/tv/${SHOW_SETTINGS_1.id}/season/1`]: () => ({
    id: 59011,
    season_number: 1,
    name: "Season 1",
    overview: "",
    air_date: "2020-01-01",
    poster_path: null,
    episodes: [
      {
        id: 590111,
        episode_number: 1,
        season_number: 1,
        name: "A Spoiler-Sensitive Title",
        overview: "A revealing description of what happens.",
        runtime: 40,
        air_date: "2020-01-01",
        still_path: "/settings-episode1-fixture.jpg",
        vote_average: 0,
      },
      {
        id: 590112,
        episode_number: 2,
        season_number: 1,
        name: "Another Spoiler-Sensitive Title",
        overview: "Another revealing description.",
        runtime: 40,
        air_date: "2020-01-08",
        still_path: "/settings-episode2-fixture.jpg",
        vote_average: 0,
      },
    ],
  }),
  [`/3/tv/${SHOW_CALENDAR_1.id}`]: () => ({
    ...SHOW_CALENDAR_1,
    tagline: "",
    last_air_date: CALENDAR_TODAY,
    status: "Returning Series",
    genres: [],
    original_language: "en",
    number_of_seasons: 1,
    number_of_episodes: 3,
    episode_run_time: [],
    created_by: [],
    seasons: [
      {
        id: 160011,
        season_number: 1,
        name: "Season 1",
        overview: "",
        air_date: "2020-01-01",
        episode_count: 3,
        poster_path: null,
      },
    ],
    // TMDB's own next/last-episode-to-air fields — the same episode
    // shape the season endpoint below returns for episodes 2/3.
    last_episode_to_air: {
      id: 1600102,
      episode_number: 2,
      season_number: 1,
      name: "The Turn",
      overview: "",
      runtime: 40,
      air_date: CALENDAR_TODAY,
      still_path: null,
      vote_average: 0,
    },
    next_episode_to_air: {
      id: 1600103,
      episode_number: 3,
      season_number: 1,
      name: "The Reckoning",
      overview: "A spoiler-laden description of what happens.",
      runtime: 40,
      air_date: CALENDAR_IN_5_DAYS,
      still_path: "/calendar-episode3-fixture.jpg",
      vote_average: 0,
    },
  }),
  [`/3/tv/${SHOW_CALENDAR_1.id}/season/1`]: () => ({
    id: 160011,
    season_number: 1,
    name: "Season 1",
    overview: "",
    air_date: "2020-01-01",
    poster_path: null,
    episodes: [
      {
        id: 1600101,
        episode_number: 1,
        season_number: 1,
        name: "The Beginning",
        overview: "",
        runtime: 40,
        air_date: "2020-01-01",
        still_path: null,
        vote_average: 0,
      },
      {
        id: 1600102,
        episode_number: 2,
        season_number: 1,
        name: "The Turn",
        overview: "",
        runtime: 40,
        air_date: CALENDAR_TODAY,
        still_path: null,
        vote_average: 0,
      },
      {
        id: 1600103,
        episode_number: 3,
        season_number: 1,
        name: "The Reckoning",
        overview: "A spoiler-laden description of what happens.",
        runtime: 40,
        air_date: CALENDAR_IN_5_DAYS,
        still_path: "/calendar-episode3-fixture.jpg",
        vote_average: 0,
      },
    ],
  }),
  [`/3/tv/${SHOW_CALENDAR_2.id}`]: () => ({
    ...SHOW_CALENDAR_2,
    tagline: "",
    last_air_date: null,
    status: "Returning Series",
    genres: [],
    original_language: "en",
    number_of_seasons: 1,
    number_of_episodes: 1,
    episode_run_time: [],
    created_by: [],
    seasons: [
      {
        id: 160111,
        season_number: 1,
        name: "Season 1",
        overview: "",
        air_date: CALENDAR_IN_3_DAYS,
        episode_count: 1,
        poster_path: null,
      },
    ],
    last_episode_to_air: null,
    next_episode_to_air: {
      id: 1601101,
      episode_number: 1,
      season_number: 1,
      name: "The Premiere",
      overview: "",
      runtime: 40,
      air_date: CALENDAR_IN_3_DAYS,
      still_path: null,
      vote_average: 0,
    },
  }),
  [`/3/movie/${MOVIE_CALENDAR_1.id}`]: () => ({
    ...MOVIE_CALENDAR_1,
    tagline: "",
    release_date: CALENDAR_IN_2_DAYS,
    runtime: 100,
    status: "Post Production",
    genres: [],
    original_language: "en",
    production_countries: [],
    belongs_to_collection: null,
  }),
};

export function startTmdbMockServer(port: number): Promise<Server> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const handler = ROUTES[url.pathname];

    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status_code: 34,
          status_message: "The resource you requested could not be found.",
        }),
      );
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(handler(url)));
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
