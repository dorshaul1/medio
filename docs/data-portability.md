# Data Portability

Settings → Data (`/settings/data`) is a trust and onboarding feature, not
a generic backup dashboard: a user should be able to bring meaningful
viewing history into MEDIO without starting from zero, and should always
be able to take their own data back out. This document covers the
domain model and architecture; see `CLAUDE.md`, "Data Portability", for
the durable rules this expands on.

## Domain layout

- **`server/import/`** — the shared import domain. `types.ts` (the
  normalized `ParsedImportRecord` union and `ImportPlan` shapes),
  `date.ts` (date-only parsing + duplicate-date comparison, pure),
  `normalize.ts` (title normalization, pure), `csv-parse.ts`/
  `csv-headers.ts` (a small hand-written RFC 4180 CSV parser, pure),
  `parsers/` (one file per source — `native.ts`, `letterboxd.ts`,
  `generic-csv.ts` — every one pure, no I/O), `matching.ts` (I/O —
  batched TMDB identity resolution through `server/tmdb/`),
  `candidates.ts` (I/O — a bounded snapshot of the user's existing
  state), `plan.ts` (pure — the dry-run plan builder), `compose.ts` (I/O
  — ties matching + candidates + plan together for one preview request),
  `persist.ts` (I/O — the one place a confirmed plan is actually
  written), `batches.ts` (I/O — list/rollback).
- **`server/export/`** — `native.ts` (the versioned JSON export),
  `csv.ts` (the watch-history CSV, built from the same unified Diary
  read model Diary itself uses), `csv-write.ts` (a small CSV writer with
  spreadsheet-injection protection), `types.ts` (the native export
  schema both the writer and the native parser depend on).
- **`features/settings/`** — `data-settings.tsx` (the category page),
  `import-flow.tsx` (the client-side step machine: source → upload →
  preview → confirm → result), `data-export-section.tsx`,
  `data-import-history.tsx`, `data-actions.ts` (the Server Actions
  bridging the UI to the domain above).

## Normalized import model

Every source parser maps its raw rows into one shared intermediate
representation (`ParsedImportRecord` — `movieWatch` / `episodeWatch` /
`planningItem` / `showTrackingState` / `comment`) before
matching, planning, or persistence ever sees it. Source-specific logic
never leaks past its own parser file — see `CLAUDE.md`, "No import
source in core WatchEvent semantics".

Each record carries a `MediaIdentityRef`:

- `{ kind: "known", mediaType, providerId }` — real TMDB identity,
  produced only by the native parser (a MEDIO export already carries
  it).
- `{ kind: "titleYear", mediaType, title, year }` — everything else,
  resolved against TMDB by `matching.ts` before a plan can be built.

## Media matching rules

Deterministic, never fuzzy-similarity-as-final-truth (see
`normalize.ts`'s exact, punctuation/case-insensitive title comparison):

1. **Native `known` identity** — no matching needed at all; this is the
   highest-fidelity import path.
2. **Exact title + year** — if exactly one provider result's normalized
   title (or original title) matches and its release year matches the
   source's year, it resolves automatically.
3. **Title match, year conflict or multiple year matches** — flagged
   `needsReview`, never auto-resolved by picking a different year.
4. **Title match, no year given** — resolves automatically only if
   there's exactly one title match; more than one is `needsReview`.
5. **No title match at all** — `notFound`.
6. **The provider call itself fails** — `lookupFailed`, distinct from
   `notFound` (see "Provider failure" below) and retryable.

No IMDb-ID lookup is implemented in this phase — Letterboxd's own export
doesn't include a TMDB id, and building a separate IMDb→TMDB resolution
path wasn't justified for this pass; see "Known limitations".

**Batched, never one lookup per row**: `matching.ts`'s
`resolveIdentities` collects every *distinct* `(mediaType, title, year)`
triple across a whole parsed file first, resolves each exactly once
(bounded concurrency), then applies the result to every record that
shared it — a 200-entry Letterboxd diary for the same rewatched film
issues one TMDB request, not 200.

### Match confidence

Never a fake percentage ("92% match"). Every entry's status is one of
`ready` / `duplicate` / `conflict` / `needsReview` / `notFound` /
`lookupFailed` — human states, never a numeric score. `needsReview`
carries up to 5 real candidates (title/year/poster), grouped by distinct
query across every record that shares it, so a compact review list never
repeats the same ambiguous title once per viewing.

## Import plan (the dry run)

`plan.ts`'s `buildImportPlan` takes already-resolved records plus a
snapshot of the user's existing state and decides, per record,
`ready` / `duplicate` / `conflict` / carries through `needsReview` /
`notFound` / `lookupFailed` — **before anything is written**. Same input
always produces the same plan (no randomness, no unstable ordering).

Duplicate/conflict rules, by domain:

- **Movie/episode watch** — a `duplicate` if an existing watch event
  (native or from an earlier import) shares the same date (see "Watch
  timestamps" below for the exact comparison). Two watches on genuinely
  different dates are always both `ready` — real rewatches are never
  collapsed. This check also runs *within* one import pass, seeded from
  the real existing state and updated as each record is decided — so the
  same file imported twice in one sitting (or a source file with its own
  duplicate rows) is caught too, not just duplicates against
  pre-existing history.
- **Planning (Watchlist/Backlog)** — `conflict` if the title already has
  *any* planning entry (existing state always wins — see "Planning
  merge"), if the movie is already watched, or if the show is already
  tracked. Never a downgrade of a stronger existing intent.
- **Show tracking state** — `conflict` if any explicit tracking state
  already exists for the show.
- **Comments** — `conflict` if a comment already exists. Existing value
  always wins; import is never a silent overwrite or concatenation.

## Merge semantics

Import always merges into existing MEDIO data, never replaces it. The
one rule, applied uniformly across Planning/Comments/Show tracking
state: **existing MEDIO state always wins.** An import only ever fills
in something that didn't already exist; it never overwrites, downgrades,
or silently changes a value the user already set. This was chosen over
"stronger intent wins" for Planning specifically because one uniform
rule across every domain is simpler to explain and reason about than a
per-domain exception.

Preferences are the one domain that isn't imported by default at all —
see "Preferences import" below.

## Idempotency & rewatch semantics

Importing the same file twice must never duplicate history, but must
never collapse real rewatches either — these are two sides of the same
mechanism (`sameWatchDate` in `date.ts`):

- **`exact` precision** (a native re-import's real timestamp) — two
  events are the same viewing only if their instants are identical.
- **`dateOnly` precision** (Letterboxd, generic CSV) — two events are
  the same viewing if they fall on the same *UTC calendar date*. This is
  the precision the source actually gave; comparing at higher precision
  than the source provides would be fabricating certainty that isn't
  there.

Known limitation: comparing by UTC calendar date against an existing
event's own precise instant can, right at a timezone boundary, miss a
same-day match if that existing event was originally recorded near
midnight in the user's own local time (its UTC date can differ from what
the user saw locally). This errs toward the safe direction on purpose —
the failure mode is one extra watch event, never a silently suppressed
real rewatch.

## Episode history — exact vs. vague

For TV, exact episode history is imported only when the source actually
supplies show + season + episode + a watch date (native exports always
do; generic CSV can, with explicit `season`/`episode` columns).
**A vague "show completed" or "watched this show on this date" with no
episode-level detail is never converted into fabricated
`EpisodeWatchEvent` rows** — it's skipped, with a real, visible reason
("vague show-level completion can't be imported as exact episode
history"). Letterboxd doesn't support show/episode import at all in
this phase (its own export is movie-only) — see "Letterboxd" below.

## Watch timestamps & timezone

Preserving source precision, never inventing it, is the load-bearing
rule throughout this domain (`server/import/date.ts`):

- **Exact instants** (a native export's own ISO timestamp) are preserved
  exactly.
- **Date-only values** (Letterboxd's `Watched Date`, generic CSV's
  `watched_at`) are anchored at **12:00 UTC**, not midnight. This is
  deliberate: `MovieWatchEvent`/`EpisodeWatchEvent.watchedAt` is a real
  `timestamptz` instant, and Diary groups by the *browser's local*
  calendar day — midnight UTC would shift to the *previous* local day
  for every negative-UTC-offset timezone, exactly the classic bug
  `CLAUDE.md` warns against. Noon UTC keeps the intended calendar date
  stable for every offset from UTC-12 through UTC+11.
  - **Known, documented gap**: real-world timezone offsets actually span
    UTC-12 through UTC+14 (26 hours), wider than any single anchor can
    fully cover. A handful of the most extreme eastern offsets (roughly
    UTC+12 through +14 — New Zealand, Fiji, Kiribati, Tonga) can see an
    imported date-only event read one calendar day later than intended.
    This is an honest, accepted limitation, not a silent one.
- This is never presented as a real wall-clock time anywhere in the UI —
  date-only precision is preserved on the record (`datePrecision`) and
  never implies false exactness.

## Rollback semantics

"Undo import" is deliberately conservative. It does **not** delete every
record that happens to match imported media — it only removes records
that were created by that specific batch and haven't become
independently meaningful since.

**Mechanism — batch attribution with ownership transfer on edit.** Every
domain table that Import can create a row in (`movie_watch_events`,
`episode_watch_events`, `media_planning_items`, `show_tracking_state`,
`media_comments`) carries a nullable `import_batch_id`.
The import persistence layer (`persist.ts`) sets it when it creates a
row. Every *real* product mutation — `recordMovieWatch`/
`recordEpisodeWatch`'s own creation, `updateMovieWatchedAt`/
`updateEpisodeWatchedAt`'s date edits, `upsertShowStatus`
(`startWatchingShow`/`putShowOnHold`/`dropShow`), `upsertPlanningIntent`
(`addToWatchlist`/`addToBacklog`/`changePlanningIntent`),
`setMediaComment` — unconditionally clears it back to
`null` whenever it's called the normal way (i.e., without an explicit
`importBatchId`, which only the import layer itself ever passes). A
later, genuine user action on an imported row therefore always detaches
it from the batch, automatically, with no separate "was this touched"
flag to maintain.

Rollback (`batches.ts`'s `rollbackImportBatch`) then does exactly one
thing per domain table: `DELETE ... WHERE import_batch_id = :batchId AND
user_id = :userId`. Because a real edit already cleared the column,
this can never remove a later, independent user choice — it is
*structurally* impossible, not just conventionally avoided. The
`import_batches` row itself is never deleted by rollback — it's marked
`rolled_back` and stays as a permanent audit record. Rolling back an
already-rolled-back batch is a safe, idempotent no-op.

If a domain's rollback couldn't be made exactly safe this way, it
wouldn't be advertised as reversible for that domain — in practice, this
mechanism covers every domain Import writes to, so rollback is complete
across the whole batch.

## Import batches

`import_batches` (`server/db/schema/import.ts`) is the one durable,
auditable record of a confirmed import: `userId`, `source`
(`medio`/`letterboxd`/`csv`), `sourceFilename` (display metadata only),
`importVersion` (this domain's own model version, `IMPORT_MODEL_VERSION`
in `server/import/types.ts` — distinct from a native export file's own
`schemaVersion`), `status` (`completed`/`rolled_back`), `counts` (a
per-domain created-record snapshot, for the Settings → Data history list
— display-only, never re-derived by counting live `import_batch_id`
matches, since those may have since been edited/detached), and
`importedAt`.

## Native export

`server/export/native.ts` builds a complete, versioned export of the
current user's own data:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-08-10T12:00:00.000Z",
  "data": { "...": "..." }
}
```

Included: movie/episode watch events, planning items (Watchlist/
Backlog), show tracking state, comments, and — only when the user
explicitly opts in via the "Include preferences" toggle — preferences.
Media history is always the primary export value; preferences are
additive, never bundled in silently.

**Never included**: auth credentials, secrets, session data, cached
provider responses, or internal database row ids as meaningful external
identity. Every record's identity is the same (provider, media type,
provider id) triple the rest of this app already treats as canonical
(see `docs/media-provider.md`, "Identifiers") — `title`/`year` (hydrated
once per distinct title, bounded concurrency, never one fetch per row)
ride along only as human-readable fallback metadata, so the file stays
meaningful opened outside MEDIO too.

### Versioning

`NATIVE_EXPORT_SCHEMA_VERSION` (`server/export/types.ts`) is the one
shared contract the writer and `server/import/parsers/native.ts` (the
reader) both depend on. The reader explicitly rejects a file whose
`schemaVersion` is newer than it understands, with a clear message —
never a silent partial/garbled parse. Only version 1 exists so far; a
future version 2 would branch inside the reader (a version-keyed switch)
rather than this phase speculatively building that branch now.

## Watch-history CSV export

`server/export/csv.ts` builds a human-readable chronological CSV from
the exact same unified Diary read model (`getDiaryPage`) the Diary page
itself renders from — never a separate history calculation, and it
naturally paginates through the user's *entire* history (a large,
bounded page size, several round trips for a big history — never one
unbounded query). Columns: `type, title, year, season, episode,
episode_title, watched_at, rewatch_number` — `rewatch_number` is
Diary's own already-computed per-title ordinal, never re-derived here.

### Spreadsheet-injection protection

Every exported CSV cell goes through `csv-write.ts`'s `sanitizeCsvCell`:
a cell whose first character is `=`, `+`, `-`, or `@` (the characters
Excel/Google Sheets/LibreOffice would interpret as the start of a
formula) gets a leading apostrophe, which every major spreadsheet app
treats as "force this cell to plain text." Applied uniformly to every
CSV this app ever writes.

## Import sources

Priority order this phase actually implements: **MEDIO native → 
Letterboxd → generic CSV.** Trakt is deliberately **not implemented in
this phase** — not because its format is unstable, but as a scope
decision consistent with "don't add ten integrations at once"; the
shared parser/matching/plan/persist architecture already generalizes to
a future Trakt parser without any change to core persistence.

### MEDIO native

The highest-fidelity import path — see "Native export" above for the
shape. Every record already carries real TMDB identity, so nothing needs
matching; only the merge/duplicate rules above apply.

### Letterboxd

**Verification note**: Letterboxd's own export documentation pages
(`letterboxd.com/about/importing-data/` and related) returned HTTP 403
to automated fetches during implementation. The format below was
corroborated across two independent secondary technical sources (a
Movary integration doc and a detailed third-party blog post analyzing a
real export), not verified against Letterboxd's own primary
documentation. The parser is written defensively — case-insensitive,
alias-tolerant header matching (`csv-headers.ts`) — specifically because
of this uncertainty, rather than asserting one brittle exact header
string. This should be validated against a real Letterboxd export before
being considered fully confirmed.

Supported files (a user uploads however many of these they have — the
parser auto-detects which is which by column shape, never asking the
user to categorize them):

- **`diary.csv`** (detected by a `Watched Date` column) — the
  authoritative source for watch events. Each row is one real viewing
  with a real date; multiple rows for the same film **are** Letterboxd's
  own representation of a rewatch, imported as separate
  `MovieWatchEvent`s, never collapsed.
- **`ratings.csv`** (a `Rating` column, no `Watched Date`) — recognized
  but not imported: MEDIO has no personal rating feature (see
  `docs/opinions.md`). The parser reports this honestly, once per file
  (`server/import/parsers/letterboxd.ts`), rather than silently dropping
  it or treating it as an unrecognized file.
- **`watchlist.csv`** (`Name`/`Title`, no `Rating`/`Watched Date`) —
  maps to MEDIO's **Watchlist** intent only, never Backlog. Letterboxd
  has no stronger-intent concept to map Backlog from.

**Not imported from Letterboxd in this phase**: `watched.csv` (films
marked watched with no diary date — there is no reliable watched date to
import, so importing it would mean fabricating a timestamp, which this
domain never does), reviews, likes, ratings (see above), or any TV/
episode data (Letterboxd tracks films only).

### Generic CSV

A small, intentionally bounded schema — not an arbitrary column-mapping
importer. Exactly these columns (`GENERIC_CSV_COLUMNS` in
`server/import/parsers/generic-csv.ts`), matched by exact
case-insensitive header name, in any order:

| Column | Required | Meaning |
| --- | --- | --- |
| `media_type` | yes | `movie` or `show` |
| `title` | yes | Title as it should be matched against TMDB |
| `year` | no | Release/first-air year, narrows matching |
| `season` | no | Required alongside `episode` for a Show watch |
| `episode` | no | Required alongside `season` for a Show watch |
| `watched_at` | no | `YYYY-MM-DD` — creates a watch event |
| `list` | no | `watchlist` or `backlog` — creates a planning item |

A `show` row with `watched_at` but no `season`/`episode` is skipped with
a real, visible reason (see "Episode history" above) — never silently
converted into a fabricated episode watch.

A downloadable template (`GENERIC_CSV_TEMPLATE`) is offered directly in
the CSV upload step.

## Security

Every uploaded file is treated as untrusted input:

- **File size** — 20 MB per file (`MAX_FILE_BYTES` in
  `features/settings/data-actions.ts`), generous enough for a realistic
  multi-thousand-title history, never unlimited.
- **Row count** — 50,000 parsed records per import
  (`MAX_RECORDS`), with a clear message asking the user to split a
  larger file rather than a silent truncation.
- **JSON shape** — the native parser validates the entire structure with
  Zod (`parsers/native.ts`) before touching any field; a malformed file
  is rejected outright with a real error, never partially trusted.
- **CSV structure** — the hand-written parser (`csv-parse.ts`) correctly
  handles quoted fields, escaped quotes, and embedded commas/newlines,
  so a maliciously or accidentally malformed cell can't desynchronize
  column alignment for the rest of the file.
- **No embedded content execution** — imported titles/comments are
  always rendered as plain text through this app's existing UI
  components; nothing from an import is ever interpreted as HTML or
  executed.
- **No raw file retention** — an uploaded file is parsed, then
  discarded; only the normalized `ParsedImportRecord`s (and, once
  confirmed, the resulting domain rows) persist. The raw upload itself
  is never written to disk or logged.
- **No analytics/logging of personal content** — imported title/comment
  content is never sent to logs or any third-party service.

## Provider failure vs. genuinely not found

`ResolvedIdentity`'s `lookupFailed` status is deliberately distinct from
`notFound`: a TMDB request that throws (network error, rate limit,
provider outage) means "we don't yet know," not "this doesn't exist."
The import preview surfaces these separately so a user isn't told their
real movie "wasn't found" just because a lookup was temporarily
unavailable — re-running the preview retries every lookup fresh.

## Performance

- **Bounded, candidate-first reads** — `candidates.ts`'s
  `getExistingUserState` is a handful of `SELECT`s scoped to the current
  user's own history (never a global scan), selecting only the columns
  needed for duplicate/conflict comparison.
- **Batched, deduplicated provider lookups** — `matching.ts` resolves
  each *distinct* title/year query exactly once, at a bounded
  concurrency (8 in-flight requests), regardless of how many raw rows
  share it.
- **Bounded, request-driven import** — this phase deliberately does
  *not* build a persisted background job system. Preview and confirm are
  both ordinary request/response Server Actions; per-record writes are
  applied sequentially with individually-scoped error handling (see
  "Import transactions" below), which stays well within a normal request
  for the realistic history sizes this app targets. If truly enormous
  imports (tens of thousands of rows) prove to need it, a real background
  job would be a deliberate future addition, not something spuriously
  built now.
- **Known scaling limit**: the client holds the full parsed record set
  and plan in memory between preview and confirm (never sent to
  analytics/logging — see "Security"). For an extremely large import
  this is a real, documented bound rather than an unlimited one; the
  50,000-record cap above is the practical ceiling for this phase.

## Import transactions

Each individual record's write (`persist.ts`'s `persistOne`) reuses the
same domain mutation function a real product action would call, which
already wraps itself in its own transaction where relevant (e.g.
`recordEpisodeWatch`'s event + show-state + planning-clear happen
together). The import as a whole is **not** one single giant transaction
across potentially thousands of rows — a per-record failure is caught,
recorded in `PersistResult.failed` with its real reason, and the rest of
the batch continues. The `import_batches.counts` snapshot always
reflects what was *actually* created, updated after persistence
completes — a partial failure is never reported as a full success.

## Cross-product consistency

Imported records become ordinary rows in the exact same tables native
actions write to, using the exact same domain mutation functions. No
downstream feature branches on import source or on `import_batch_id` —
that column is audit metadata for rollback, invisible to every other
product surface's type system (the domain types `MovieWatchEvent`,
`PlanningItem`, etc. never include it). This means:

- **Diary** shows imported events chronologically by their real
  `watchedAt`, interleaved with native ones — never grouped separately
  by import date.
- **Stats/Taste/Pick** recompute from the same event/opinion rows they
  always have; nothing import-specific was added to any of their
  calculations.
- **Library** shows imported Watchlist/Backlog/tracked-show state
  through its normal read model — no permanent "Imported" badge
  anywhere in regular product UI (provenance belongs in Settings → Data's
  import history, not scattered through Library/Diary).
- **Calendar** derives Caught Up/Waiting/next-episode from the same
  unified progress domain (`getShowEpisodeProgress`) every other surface
  uses — an imported episode watch changes derived state exactly the way
  a native one would, automatically.
- **Rewatch counts** treat an imported rewatch exactly like a native
  one — there is no second-class imported event type anywhere in the
  event schema.

## Preferences import

Native-export-only, and only when the user explicitly enables "Include
preferences" on export *and* the export actually contains a
`preferences` object. Import never silently replaces the current
account's preferences — media history is always the primary import
value. (This phase's import UI does not yet expose a preferences-merge
step in the confirm flow beyond the domains listed above — restoring
preferences from a native export is a natively-supported export
capability; wiring an explicit opt-in on the *import* side is a
reasonable, small future addition once real usage shows it's wanted,
consistent with not building unused surface area now.)

## Out of scope (this phase)

Automatic scraping of other apps, browser-extension imports, OAuth
synchronization, continuous Trakt sync, Letterboxd account login, a
cloud backup service, an arbitrary spreadsheet column-mapper, merging
between multiple MEDIO accounts, social-graph import, import-source-based
recommendations, and any form of ongoing provider-specific
synchronization. This phase is import/export, not sync — every import is
a deliberate, one-time, user-initiated action.

No push/email/browser notification infrastructure was built for this
phase either (not a natural fit here to begin with).

## Known limitations (summary)

- Letterboxd's exact export column names are corroborated from secondary
  sources only, not Letterboxd's own primary documentation (see
  "Letterboxd" above) — the parser is defensive, but should be validated
  against a real export.
- No IMDb-ID matching path exists yet — title+year is the only fallback
  matching strategy beyond native identity.
- Date-only imports can read one calendar day late for the most extreme
  eastern timezone offsets (UTC+12 through +14) — see "Watch timestamps
  & timezone".
- `watched.csv`-only Letterboxd entries (marked watched, never
  diary-logged) are not imported — there's no reliable date for them.
- Trakt import is not implemented in this phase.
- No persisted background-job infrastructure — see "Performance".
