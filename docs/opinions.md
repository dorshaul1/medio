# Opinions

MEDIO has no personal rating feature. What it has is a private per-title
**comment** — free text, "what did I think of it" — deliberately separate
from Tracking (`docs/tracking.md`): viewing events are facts ("I watched
this"), a comment is opinion. There is no star rating, no numeric score,
anywhere in the product. This is a real product decision, not a gap —
Stats/Taste's own "highest rated"-style insights don't exist for the same
reason; every taste signal there comes from exposure and rewatches
instead (see `docs/taste.md`).

## Persistence

One table, `media_comments` (`src/server/db/schema/opinions.ts`): a
primary key of `(userId, mediaType, mediaProviderId)`, `content`, and
timestamps. No `provider` column — TMDB is the only provider this app
integrates with. No relation to `movie_watch_events`/
`episode_watch_events` — a comment is title-level opinion, not tied to
any one viewing event or rewatch.

## Comment ownership

One current comment per user+media, never one per viewing event.
Rewatching, or editing/deleting watch history, never touches this row —
changing your mind about a comment later updates it in place
(`setMediaComment`'s `onConflictDoUpdate`). A row only exists when the
comment has real content — saving empty/whitespace-only text deletes the
row rather than persisting a blank one (`server/opinions/comments.ts`).

## Eligibility

The comment action only appears once a title has actually been watched,
even partially (`hasWatched`) — Movie Details (`movie-hero.tsx`) and Show
Details (`show-tracking-section.tsx`) both gate on the same signal
Tracking already computes, not a separate check. Real watch history (an
early/festival screening) always takes priority over any release-date
gate elsewhere on the same action row.

## Comment interaction

`MediaComment` sits in the same action row as tracking/planning/trailer.
Unset shows a bare icon affordance ("Add a comment"); set shows a quiet
truncated preview that opens the same editor. Editing happens in a
focused Dialog with an explicit Save/Cancel — free text genuinely
benefits from a server-confirmed save rather than persisting on every
keystroke, so this is the one place in the opinion layer a real text
`Button` is correct rather than icon-first. A close with unsaved changes
prompts a plain `confirm()` before discarding.

## Comment length

Capped at `COMMENT_MAX_LENGTH` (4000 characters) — a deliberate
middle-of-the-range limit, enforced both in the domain layer
(`setMediaComment`) and as a database check constraint, so it can never
be bypassed by a path that skips the domain function.

## Privacy / ownership

Every read/write in `server/opinions/` derives the user from the
validated session (`requireSession`) and scopes its query to that user —
never a caller-supplied user ID, never a lookup by media identity alone.
`server/opinions/authorization.test.ts` proves one user can never read or
mutate another user's comment even when they know the exact media
identity. Comment content is private and is never sent to logs, shared
caches, or Stats/Taste analytics (see `docs/taste.md`, "Notes" — comment
text is never analyzed for taste signal).

## Import

`server/import/`'s Letterboxd parser recognizes a `ratings.csv` export
and reports honestly that MEDIO has no rating feature to import it into
(`server/import/parsers/letterboxd.ts`) — it does not silently drop the
file or fabricate a comment from it. Diary/watchlist imports that also
carry free-text notes may create a comment via `setMediaComment`'s
`importBatchId` path, but only when no comment already exists for that
title — import never overwrites a real user comment (see
`docs/data-portability.md`, "Comments merge").
