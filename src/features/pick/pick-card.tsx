"use client";

import { CheckCircle2, PlayCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { mediaHref } from "@/features/media/media-route";
import { PlanningControl } from "@/features/media/planning-control";
import { markMovieWatchedAction } from "@/features/movies/movie-tracking-actions";
import { reasonCopy } from "@/features/pick/reason-copy";
import {
  markEpisodeWatchedAction,
  startWatchingShowAction,
} from "@/features/shows/show-tracking-actions";
import { cn } from "@/lib/utils";
import type { PickCandidate, PickRecommendation } from "@/server/pick/types";
import type { PlanningIntent } from "@/server/planning/types";
import { backdropUrl, posterUrl } from "@/server/tmdb/images";

// The one contextual action a Pick card offers — never more than one,
// same "one obvious next action" discipline as the rest of the product
// (see CLAUDE.md, "UX & Interaction"). A continuation or a saved title
// already has real tracking intent behind it, so its action *commits*
// that intent (mark watched / start watching, reusing the exact same
// Server Actions every other tracking control in the app uses — no
// bespoke Pick-only mutation). A fresh discovery pick has no intent yet,
// so its one action is Save, via the shared `PlanningControl` — which is
// also how "respect Default Save Destination" (see docs/settings.md)
// comes for free here rather than being re-implemented.
function QuickAction({
  candidate,
  defaultSaveIntent,
  onTracked,
}: {
  candidate: PickCandidate;
  defaultSaveIntent: PlanningIntent;
  onTracked: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function commit(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      // The underlying tracking state just changed server-side (an
      // episode advanced, a show started, a planning entry cleared) — Pick
      // recomputes from that instead of patching local state, the same
      // "derived, never a stale copy" rule Tracking/Library/Diary already
      // follow (see docs/recommendations.md, "Quick-tracking
      // integration").
      onTracked();
    });
  }

  switch (candidate.kind) {
    case "continueEpisode":
      return (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            commit(() =>
              markEpisodeWatchedAction({
                showProviderId: candidate.mediaProviderId,
                seasonNumber: candidate.nextEpisode.seasonNumber,
                episodeNumber: candidate.nextEpisode.episodeNumber,
                episodeProviderId: candidate.nextEpisode.episodeProviderId,
              }),
            )
          }
        >
          <CheckCircle2 /> Mark watched
        </Button>
      );
    case "savedMovie":
      return (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => commit(() => markMovieWatchedAction(candidate.mediaProviderId))}
        >
          <CheckCircle2 /> Mark watched
        </Button>
      );
    case "savedShow":
      return (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() => commit(() => startWatchingShowAction(candidate.mediaProviderId))}
        >
          <PlayCircle /> Start watching
        </Button>
      );
    case "discoveryMovie":
    case "discoveryShow":
      return (
        <PlanningControl
          mediaType={candidate.mediaType}
          mediaProviderId={candidate.mediaProviderId}
          intent={null}
          title={candidate.title}
          defaultIntent={defaultSaveIntent}
        />
      );
  }
}

function reasonText(recommendation: PickRecommendation): string {
  return recommendation.reasons.map(reasonCopy).join(" · ");
}

// The single top suggestion — full-bleed artwork, same hero language as
// Home's `UpNextCard` (real artwork as background, fixed dark scrim/
// fixed white text, since it floats over unpredictable poster/backdrop
// colors in either theme), not a themed card. This is the one place in
// Pick an "Another Pick" control belongs — it re-rolls specifically the
// top suggestion (see docs/recommendations.md, "Another Pick" vs.
// "Not now").
export function PrimaryPickCard({
  recommendation,
  defaultSaveIntent,
  onTracked,
  onAnotherPick,
  isBusy,
}: {
  recommendation: PickRecommendation;
  defaultSaveIntent: PlanningIntent;
  onTracked: () => void;
  onAnotherPick: () => void;
  isBusy: boolean;
}) {
  const { candidate } = recommendation;
  const art = backdropUrl(candidate.backdrop, "large") ?? posterUrl(candidate.poster, "large");
  const href = mediaHref({ mediaType: candidate.mediaType, id: candidate.mediaProviderId });

  return (
    <section
      aria-labelledby="pick-primary"
      className="relative overflow-hidden rounded-lg border border-border"
    >
      {art ? (
        <>
          <Image
            src={art}
            alt=""
            fill
            sizes="(min-width: 1024px) 900px, 100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/72" />
        </>
      ) : (
        <div className="absolute inset-0 bg-surface-subtle" />
      )}

      <div className="relative flex flex-col gap-4 p-5 sm:p-6">
        <p
          className={cn(
            "text-xs font-medium tracking-wide uppercase",
            art ? "text-white/75" : "text-muted-foreground",
          )}
        >
          Tonight's pick
        </p>

        <div className="flex flex-col gap-1">
          <Link
            href={href}
            id="pick-primary"
            className={cn(
              "w-fit text-xl font-medium tracking-tight text-balance underline-offset-4 hover:underline sm:text-2xl",
              art ? "text-white" : "text-foreground",
            )}
          >
            {candidate.title}
            {candidate.year ? ` (${candidate.year})` : ""}
          </Link>
          <p className={cn("text-sm", art ? "text-white/85" : "text-foreground/85")}>
            {reasonText(recommendation)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <QuickAction
            candidate={candidate}
            defaultSaveIntent={defaultSaveIntent}
            onTracked={onTracked}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onClick={onAnotherPick}
            className={art ? "text-white/85 hover:bg-white/10 hover:text-white" : undefined}
          >
            Another pick
          </Button>
        </div>
      </div>
    </section>
  );
}

// A smaller alternative — poster + title + one reason + the same one
// contextual action, plus a quiet per-card "Not now" (session-scoped,
// never a permanent dislike — see docs/recommendations.md).
export function AlternativePickCard({
  recommendation,
  defaultSaveIntent,
  onTracked,
  onNotNow,
}: {
  recommendation: PickRecommendation;
  defaultSaveIntent: PlanningIntent;
  onTracked: () => void;
  onNotNow: () => void;
}) {
  const { candidate } = recommendation;
  const poster = posterUrl(candidate.poster, "medium");
  const href = mediaHref({ mediaType: candidate.mediaType, id: candidate.mediaProviderId });

  return (
    <div className="flex gap-3 rounded-lg border border-border p-3">
      <Link
        href={href}
        className="block w-20 shrink-0 overflow-hidden rounded-md bg-surface-subtle"
      >
        <div className="relative aspect-2/3">
          {poster ? (
            <Image src={poster} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <MediaPosterFallback mediaType={candidate.mediaType} />
          )}
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <Link
            href={href}
            className="line-clamp-1 text-sm font-medium text-foreground hover:underline"
          >
            {candidate.title}
          </Link>
          <p className="line-clamp-2 text-xs text-muted-foreground">{reasonText(recommendation)}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <QuickAction
            candidate={candidate}
            defaultSaveIntent={defaultSaveIntent}
            onTracked={onTracked}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onNotNow}
            aria-label={`Not now, ${candidate.title}`}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
