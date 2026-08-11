"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import type { EpisodeDiaryEntry } from "@/server/diary/types";
import { posterUrl } from "@/server/tmdb/images";
import { DiaryEpisodeEntry } from "./diary-episode-entry";
import { sessionEpisodeLabel } from "./diary-session-grouping";

// One collapsed binge session — two or more same-show episodes watched
// close together (`groupDiarySessions`, see docs/diary.md, "Viewing
// session grouping"). Collapsed by default, especially valuable on
// mobile where repeating full-size episode rows for every entry in a
// long binge would dominate the screen (see CLAUDE.md, "Mobile Diary may
// compress repeated Episode presentation..."). The show's own poster
// (`aspect-2/3`, same geometry as `DiaryMovieEntry`) rather than any one
// episode's still — deliberately different from a plain episode row's
// visual language, so a session reads as "this is a compressed group" at
// a glance, and no single episode's identity is misleadingly implied to
// represent the whole session.
//
// The whole collapsed row is a disclosure toggle, never a navigation
// link — there's no one canonical episode a session-level click could
// mean (see docs/diary.md, "Session interaction boundaries"). Expanding
// reveals the exact same `DiaryEpisodeEntry` rows a non-grouped day would
// render, each with its own real link and its own Edit/Delete menu —
// grouping is presentation-only and never hides a correction action.
export function DiaryEpisodeSession({ entries }: { entries: readonly EpisodeDiaryEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const first = entries[0];
  if (!first) return null;

  const poster = posterUrl(first.showPoster, "small");
  const coordinateLabel = sessionEpisodeLabel(entries);
  const summary = coordinateLabel
    ? `${coordinateLabel} · ${entries.length} episodes`
    : `${entries.length} episodes`;

  return (
    <li className="flex flex-col [[data-density=compact]_&]:gap-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 rounded-md py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [[data-density=compact]_&]:py-1.5"
      >
        <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-md bg-surface-subtle sm:w-14">
          {poster ? (
            <Image src={poster} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <MediaPosterFallback mediaType="show" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="line-clamp-1 text-sm font-medium text-foreground">{first.showTitle}</p>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
        {expanded ? (
          <ChevronUp aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded ? (
        <ul className="flex flex-col divide-y divide-border border-t border-border pl-4">
          {entries.map((entry) => (
            <DiaryEpisodeEntry key={entry.id} entry={entry} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
