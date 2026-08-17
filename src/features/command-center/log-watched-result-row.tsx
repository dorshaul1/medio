"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ResultTypeTag } from "@/features/discover/result-type-tag";
import { markMovieWatchedAction } from "@/features/movies/movie-tracking-actions";
import { mediaHref } from "@/features/media/media-route";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import type { MediaSummary } from "@/server/media/types";
import { posterUrl } from "@/server/tmdb/images";

// "Log something watched"'s own result row — a real, different context
// from a normal Search result (see CLAUDE.md, "Media UI": deliberately
// different compositions for different jobs). A Movie logs directly
// through the same canonical mutation `movie-tracking-actions.ts`
// exposes everywhere else — no parallel watch-event write — and closes
// the Command Center once it succeeds, no toast (see docs/search.md,
// "Mutation UX"). A Show can't be logged at this granularity (episode
// identity matters), so it navigates to the show's own page instead,
// the fast path to the real episode-tracking UI there.
export function LogWatchedResultRow({
  media,
  onLogged,
  onNavigate,
}: {
  media: MediaSummary;
  onLogged: () => void;
  onNavigate?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const poster = posterUrl(media.poster, "small");

  if (media.mediaType === "show") {
    return (
      <Link
        href={mediaHref(media)}
        data-search-result
        className="flex min-w-0 items-center gap-3 rounded-md p-2 outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        {...(onNavigate ? { onClick: onNavigate } : {})}
      >
        <MediaThumb poster={poster} mediaType={media.mediaType} />
        <MediaLabel media={media} note="Open to log the episode" />
      </Link>
    );
  }

  function markWatched() {
    startTransition(async () => {
      await markMovieWatchedAction(media.id);
      setDone(true);
      onLogged();
    });
  }

  return (
    <button
      type="button"
      data-search-result
      disabled={isPending || done}
      onClick={markWatched}
      className="flex w-full min-w-0 items-center gap-3 rounded-md p-2 text-left outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none"
    >
      <MediaThumb poster={poster} mediaType={media.mediaType} />
      <MediaLabel media={media} note={done ? "Logged" : "Log watched"} />
      {done ? <Check aria-hidden="true" className="size-4 shrink-0 text-primary" /> : null}
    </button>
  );
}

function MediaThumb({
  poster,
  mediaType,
}: {
  poster: string | null;
  mediaType: MediaSummary["mediaType"];
}) {
  return (
    <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-sm bg-surface-subtle sm:w-14">
      {poster ? (
        <Image src={poster} alt="" fill sizes="56px" className="object-cover" />
      ) : (
        <MediaPosterFallback mediaType={mediaType} />
      )}
    </div>
  );
}

function MediaLabel({ media, note }: { media: MediaSummary; note: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <p className="truncate text-sm font-medium text-foreground">{media.title}</p>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <ResultTypeTag kind={media.mediaType} />
        {media.releaseYear ? <span>· {media.releaseYear}</span> : null}
        <span>· {note}</span>
      </p>
    </div>
  );
}
