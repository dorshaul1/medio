# Media provider

## Provider

[TMDB](https://www.themoviedb.org) (The Movie Database) is currently the
only external media metadata source — trending, search, movie/show/season
details. API v3, authenticated with a Bearer **API Read Access Token**
(not the shorter "API Key"), from a developer's own TMDB account.

## Boundary

Raw TMDB response shapes and field names (`poster_path`, `first_air_date`,
`media_type`, ...) stay inside `src/server/tmdb/` and never escape it:

```
Product/UI
  ↑ application media models (src/server/media/types.ts)
src/server/tmdb/queries.ts      — the public query surface
  ↑
src/server/tmdb/mappers.ts      — TMDB shape → domain model (pure)
src/server/tmdb/schemas.ts      — Zod validation of the fields we consume
src/server/tmdb/client.ts       — the TMDB HTTP request primitive
  ↓
TMDB HTTP API
```

- **`client.ts`** — the request primitive: base URL, Bearer auth, JSON
  Accept header, query params, an 8s request timeout
  (`AbortSignal.timeout`, composed with any caller-supplied signal via
  `AbortSignal.any`), and a single retry for transient failures (429, 5xx)
  only. Returns parsed-but-unvalidated JSON — it has no idea what shape any
  given endpoint's response should be.
- **`schemas.ts`** — Zod schemas for exactly the fields each query depends
  on, not TMDB's full response shape. Unknown/extra fields are ignored, not
  rejected, so TMDB adding fields never breaks us.
- **`mappers.ts`** — pure functions (no I/O) from a validated TMDB shape to
  a domain model in `src/server/media/types.ts`. Normalizes TMDB's
  representations of "missing" (`""` for dates/overview, `0` for
  runtime, `null` for image paths) into a single honest `null`.
- **`queries.ts`** — the public surface: fetch → validate → map, plus each
  endpoint's caching decision. Grouped by the product section that owns
  each query — see "Query ownership" below.
- **`images.ts`** — the only place that knows TMDB's image CDN host and
  size tokens; everything else works with a `MediaImage { path }` and a
  semantic size (`posterUrl(image, "medium")`), never a hand-built URL.
  Not `server-only` — it holds no credentials, unlike the rest of this
  directory.
- **`errors.ts`** — `TmdbError`, a single class with a `kind` discriminant
  (`unauthorized` | `not_found` | `rate_limited` | `unavailable` |
  `invalid_response` | `unknown`) rather than a hierarchy of subclasses.
  Callers branch on `kind`, never on a raw HTTP status or message string.

`src/server/media/types.ts` holds the application-owned domain models
(`MediaType`, `MediaImage`, `MovieSummary`, `ShowSummary`, `MediaSummary`,
`MovieDetails`, `ShowDetails`, `SeasonSummary`, `SeasonDetails`, `Episode`,
`Genre`, `CastMember`, `MovieCredits`, `Trailer`, `Pagination<T>`). Product
code — Server Components, future server operations — only ever sees these,
never a TMDB DTO.

## Domain

- `MediaSummary = MovieSummary | ShowSummary`, discriminated by
  `mediaType`. Compact — search results, trending rows, grids.
- `MovieDetails` / `ShowDetails` — richer. Both now power real detail
  pages: `MovieDetails` for `/movies/[id]`, `ShowDetails` for `/shows/[id]`.
  `ShowDetails.creators` comes straight from TMDB's `created_by` on the
  same request — no separate fetch, unlike a movie's director (which
  comes from credits).
- `SeasonSummary` (list-level, embedded in `ShowDetails.seasons`) vs.
  `SeasonDetails` (full, with `episodes` — only fetched for the one season
  a user opens; see "Query ownership"). Kept as two types deliberately —
  a season preview tile doesn't need, and Show Details never fetches,
  every season's episode list.
- `CastMember`/`MovieCredits` (movie) and `ShowCastMember`/`ShowCredits`
  (show) — deliberately minimal and deliberately separate types: no
  person detail pages exist, so a cast member carries only what its Cast
  row renders (id, name, character, profile image), never a
  general-purpose Person model. `MovieCredits.directors` and
  `ShowDetails.creators` are names only, not a full crew listing.
- `Trailer` — the one video `selectTrailer` (`src/server/tmdb/mappers.ts`)
  picked from TMDB's list (official trailer, else any trailer, else an
  official teaser; YouTube only). The domain layer never deals with "which
  of these N videos should we show" — that choice is made once, in the
  mapper.
- `MovieCollection` — the franchise collection a movie belongs to (e.g.
  "The Dark Knight Collection"), or null. `MovieDetails.collection` only
  carries the lightweight reference TMDB embeds in movie details
  (id/name/poster/backdrop); the other movies in it are a separate,
  optional fetch (`getCollectionMovies`, powering Movie Details' "Part
  of…" section) — a movie can name a collection without every part of it
  needing to be fetched just to render the movie's own page.
- TMDB's `vote_average` is exposed as `providerRating`, deliberately not
  `rating` — MEDIO has no personal rating feature (see
  `docs/opinions.md`), and this name is reserved to keep the provider's
  own popularity score from ever colliding with a real personal signal
  if one is ever added later.
- TMDB's numeric `id` is an **external provider ID**, not one of our own
  database IDs — see the comment on `MediaCommon.id`. No database table
  exists for media in this phase; a later tracking schema will reference
  `(provider, providerMediaId, mediaType)` rather than mirroring TMDB
  objects.

## Query ownership

Each query exists because a real, currently-visible product section needs
it — see `docs/architecture.md` for the Home/Discover information
architecture these support.

- **Home** — `getTrendingMovies`, `getTrendingShows` (movie-only/show-only
  trending, kept as two sections, never mixed), `getNowPlayingMovies`
  ("In theaters"), `getPopularMovies`, `getPopularShows`.
- **Discover** — `searchMovies`, `searchShows` (search, both types,
  always); `getMovieGenres`, `getShowGenres` (the curated genre rows —
  movie and TV genre IDs/names are **not** the same set, so these stay
  separate); `discoverMoviesByGenre`, `discoverShowsByGenre` (genre rows
  and the dedicated `/discover/movies|shows/genre/[genre]` pages, with a
  `DiscoverSort` — `popular` | `top_rated` | `newest` — mapped to TMDB's
  `sort_by`; `top_rated` also applies a `vote_count.gte` floor, since
  `vote_average.desc` alone surfaces obscure titles with one perfect
  vote).
- **Movie Details** (`/movies/[id]`) — `getMovieDetails` (primary,
  blocking), `getMovieCredits` (cast + director, fetched alongside details
  rather than deferred — see the page's own comment), `getMovieTrailer`
  (the one selected video, or `null` — not an error), `getCollectionMovies`
  (the "Part of…" section, only called when the movie names a collection),
  `getMovieRecommendations` (the "More like this" row). "Part of…" and
  "More like this" are both Suspense-deferred — the page's two genuinely
  secondary sections.
- **Show Details** (`/shows/[id]`) — `getShowDetails` (primary, blocking;
  seasons come from this same response — no per-season fetch here),
  `getShowTrailer`, `getShowAggregateCredits` (TMDB's *aggregate* TV
  credits, not the regular `/tv/{id}/credits` — see "TV credits" below;
  its own Suspense-deferred section since, unlike a movie's director, a
  show's creators don't require it), `getShowRecommendations`
  (Suspense-deferred, the page's other secondary section).
- **Season Details** (`/shows/[id]/seasons/[seasonNumber]`) —
  `getSeasonDetails` (the one season the user opened; Show Details never
  eagerly fetches every season's episodes — that would be an unbounded
  number of requests for a long-running show).

### TV credits

Show Details' Cast section uses TMDB's *aggregate* credits
(`/tv/{id}/aggregate_credits`), not the regular `/tv/{id}/credits` —
aggregate credits represent a person's role across the show's full run,
while the regular endpoint only reflects its latest season. Each aggregate
cast member's `character` is their first-credited role; a person crediting
more than one role over a show's run is rare enough not to warrant a
full roles list in `ShowCastMember`.

There is deliberately no combined "trending across both types" query
(TMDB's `/trending/all`) — Home always shows movies and shows as separate
sections so it's never ambiguous what a row contains.

## People

`/people/[id]` (see `docs/architecture.md`) makes actors, directors, and
show creators a real navigable entity, keyed by TMDB's own numeric person
ID — same "external provider ID, not a database ID" rule as movies/shows
(see "Identifiers" above). No Person table exists; a person is external
provider metadata, fetched fresh (behind the same `next.revalidate`
caching as movie/show details) and never mirrored into PostgreSQL.

**Domain models** (`server/media/types.ts`) — deliberately lean, matching
the existing "only what a real screen renders" discipline:

- `Person` — id, name, profile image, biography, `knownForDepartment`
  (TMDB's own professional classification, used to order Filmography
  sections — see below), birthday, deathday, birthplace. Not fetched/
  modeled: popularity score, IMDb/external IDs, homepage, social links,
  `also_known_as`, gender — none of them have a current product use.
- `CreditedPerson` — `{ id, name }`, used wherever a movie's director or a
  show's creator is surfaced inline near a title's main metadata (not a
  full cast tile). `MovieCredits.directors` and `ShowDetails.creators`
  both carry this now (previously names only) specifically so they can
  link to `/people/[id]`.
- `PersonMediaCredit` / `PersonCastCredit` / `PersonCrewCredit` /
  `PersonCredits` — a person's combined acting/crew credits, one shared
  shape between a movie and a show credit. Carries `voteCount` purely as
  an internal ranking signal for Known For (see below) — never rendered,
  same "provider number used for sorting, not shown" precedent as
  Discover's top-rated `vote_count.gte` floor.

**Provider queries** (`server/tmdb/queries.ts`):

- `getPersonDetails(id)` — `/person/{id}`. The Person page's one blocking
  fetch.
- `getPersonCombinedCredits(id)` — `/person/{id}/combined_credits`, TMDB's
  *combined* movie + TV, cast + crew credits in one request. Chosen over
  separate `/person/{id}/movie_credits` + `/person/{id}/tv_credits` calls
  (twice the requests for the same total data) and over
  `append_to_response` on the details request (would remove the
  Filmography section's own cache entry/error isolation — a credits
  failure would take the identity content down with it). Kept as its own
  query, Suspense-deferred from the page, mirroring every other detail
  page's "primary details request, separate secondary-content requests"
  shape.

Not fetched: `/person/{id}/images` (the details response's one profile
photo is enough — see "Person images" below), external-ID endpoints, or
`/person/popular`.

**People search** — `searchPeople(query)` wraps `/search/person`,
validated/mapped into `PersonSummary` (id, name, profile, `knownFor
Department`, `popularity`, up to a few `knownFor` titles — all already
present on this one response, no extra fetch). Makes People first-class
Unified Search results alongside Movies/Shows — see `docs/search.md`,
which owns the product-level ranking/UI; this is only the provider
integration boundary.

**Filmography grouping** (`server/people/compose.ts`, pure, no I/O) turns
TMDB's raw credit list into the product's own professional categories —
`buildFilmographySections`:

- **Acting** — from `cast`, always its own section when non-empty.
- **Directing** — crew credits with `job === "Director"`.
- **Writing** — crew credits with `department === "Writing"` (covers
  Screenplay/Story/Teleplay/... without a per-job allowlist).
- **Producing** — crew credits with `job` in `{"Producer", "Executive
  Producer"}` only — TMDB's Production department includes many minor
  titles (Associate Producer, Line Producer, ...) that would just be
  noise in a curated Filmography.

Everything outside these four (Camera, Sound, Editing, Art, VFX, Thanks,
...) is dropped — no catch-all "Crew" section. Within a section, entries
are deduplicated by media identity (a movie credited as both Director and
Screenplay appears once in Directing and once in Writing — two real
credits — never twice in the same section) and sorted newest-first, with
unknown release years pushed to the end rather than the top. Two character
patterns are filtered from Acting, both confirmed as real noise against
actual TMDB data (not hypothetical — found via rendered review of
Christopher Nolan's and Daniel Craig's real filmographies): `(archive
footage)` — TMDB's own convention for a reused clip, not a real
appearance — and any character starting with "Self" followed by
whitespace, `(`, or the end of the string (TMDB formats these several
ways: "Self", "Self (voice)", "Self - Director",
"Self · Director / Writer / Producer") — talk-show/making-of/award-show/
documentary-narration appearances, which for a well-known director or
actor are common enough to otherwise crowd out real dramatic roles at the
top of a newest-first list. Both patterns are conservative on purpose: a
real character name that merely starts with "self" with no separating
whitespace ("Self-Made Man") is never affected.

Sections are ordered by primary profession: `Person.knownForDepartment`
picks the lead section (a director's page leads with Directing, an
actor's with Acting), the rest follow a fixed fallback order
(Directing → Writing → Producing → Acting). This is a deliberate
simplification — `known_for_department` sometimes lags for a prolific
actor-director — not a second ranking pass over real credit volume.

**Known For** (`selectKnownFor`) — a small (≤6), deduplicated selection
ranked by `voteCount`, the one signal already present on the same
combined-credits response. Omitted entirely (not shown as a sparse or
low-quality row) when the credit pool is smaller than 3 titles, or when
nothing in it has any real vote signal — in both cases "most voted" would
be an arbitrary pick, not a meaningful one, and the full Filmography leads
the page instead.

**Person images** — the `/person/{id}` details response's own
`profile_path` is the only image fetched; the full `/person/{id}/images`
gallery is never called, since one portrait photo is all the header
renders. `images.ts`'s `profileUrl()` uses TMDB's own documented profile
size tokens (`w185`/`h632`) — a different token set from poster/backdrop/
still, even though the CDN mechanism is shared.

**Navigation** — every intentionally-surfaced actor, director, or creator
name links to `/people/[id]`: Movie/Show Details' cast tiles
(`CastMemberTile`, now the whole tile, not a static card), a movie's
"Directed by" line, a show's "Created by" line (both via the shared
inline `PersonLink`). Episode-level guest stars/directors are explicitly
out of scope this phase (see "Season / Episode People" below and
`docs/architecture.md`).

## Credentials

`TMDB_API_TOKEN` is part of the same validated server env
(`src/config/env/`) as `DATABASE_URL`/`BETTER_AUTH_SECRET` — server-only,
never sent to the browser, never logged. `client.ts` is the only module
that reads it into a request header.

## Caching

Deliberately different per endpoint, using `fetch`'s `next.revalidate`
(this project doesn't enable Cache Components/`cacheComponents`, so this is
Next's ["previous model"](https://nextjs.org/docs/app/guides/caching-without-cache-components)
of fetch caching):

- **Trending** — 1 hour. Changes daily upstream; an hour is fresher than
  necessary but avoids re-fetching on every request.
- **Movie/show/season details** — 24 hours. A given title's metadata
  changes rarely.
- **Search** — not cached (`cache: "no-store"`). Search queries have
  effectively unbounded cardinality; long-caching arbitrary strings would
  grow the cache forever for little reuse.

## Image URLs

`images.ts` hardcodes TMDB's image CDN host (`image.tmdb.org`) and a small
set of documented, long-stable size tokens (`w154`, `w342`, `w500`, `w780`,
`w1280`, `w300`) behind semantic names (`posterUrl(image, "small" |
"medium" | "large")`, `backdropUrl(image, "medium" | "large")`,
`stillUrl(image)`), rather than calling TMDB's `/configuration` endpoint at
runtime. That endpoint exists specifically to make this
configurable/future-proof, but the image CDN's URL structure has been
stable for years — the extra network round trip (and the caching question
it would raise) isn't worth it for a handful of constants documented at
https://developer.themoviedb.org/reference/configuration-details. This can
be revisited if TMDB ever actually changes it.

## Database

The application database (PostgreSQL) does not mirror the TMDB catalog —
no movie/show/season tables, no cached trending/search results. TMDB owns
external catalog metadata; our database owns user-owned state. A later
tracking domain will store references (provider + provider media ID +
media type), never a copy of TMDB's own data — see
[`docs/database.md`](database.md).

### Show status vs. watch status

`ShowDetails.status` is TMDB's own provider status ("Returning Series",
"Ended", "Canceled", "In Production", ...) — surfaced as-is on Show
Details, and also what `formatShowYearRange`
(`src/features/shows/format-show-year-range.ts`) uses to decide whether a
year range reads as "2018–present" or "2018–2024". This is categorically
separate from a future personal watch status (e.g. "Watching", "Caught
up") that a later tracking phase will add — the two must never share a
type or a persisted value, even though both could eventually render near
each other on Show Details.

## Attribution

TMDB requires attribution for API usage. The required notice, verbatim
(see [TMDB's terms](https://www.themoviedb.org/about/logos-attribution)):

> This product uses the TMDB API but is not endorsed or certified by TMDB.

**This is now overdue, not hypothetical** — Home and Discover render real
TMDB-sourced content today, and no screen carries this notice yet. Add it
to a real, low-emphasis location (e.g. a footer or a Credits/About screen)
the next time product UI work touches the shell — not on every page, and
never made to look like TMDB's own branding.

### Watch providers (future)

TMDB's watch-provider data (where to stream/rent/buy) is sourced from
[JustWatch](https://www.justwatch.com) and carries its own attribution
requirement. Watch-provider queries are explicitly out of scope for this
phase — when that feature is built, implement JustWatch attribution at the
same time, not as an afterthought.

## Verifying connectivity

```bash
pnpm tmdb:check
```

Makes one lightweight authenticated request (`/3/authentication` — it
returns nothing but a success flag) and prints a concise result. Not part
of `pnpm check` or CI — normal builds/tests never need a real token (CI
uses a syntactically-valid placeholder; nothing in the build or test suite
makes a live TMDB call).
