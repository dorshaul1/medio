import Image from "next/image";
import Link from "next/link";
import { ResultTypeTag } from "@/features/discover/result-type-tag";
import { MediaPosterFallback } from "@/features/media/media-poster-fallback";
import { mediaHref } from "@/features/media/media-route";
import { MediaStateHint } from "@/features/media/media-state-hint";
import { PlanningControl } from "@/features/media/planning-control";
import type { MediaPersonalState, MediaSummary } from "@/server/media/types";
import type { PlanningIntent } from "@/server/planning/types";
import { posterUrl } from "@/server/tmdb/images";

// One row shape for both Movie and Show results in Unified Search — a
// horizontal scannable row, not another poster grid (search is task-
// oriented: find a known title fast). Media type is communicated via
// `ResultTypeTag`'s small icon+word, not by grouping/section order (see
// docs/search.md, "Unified search ranking" — Movies and Shows sit
// side by side in one ranked list).
//
// Personal state + quick Save are the one meaningful thing this adds over
// a plain title/year row — both come from an already-batched lookup the
// caller composed for the whole visible result set, never a query per
// row. Save only ever renders for media that hasn't started being
// consumed yet (see `PlanningControl`'s own comment) — an already
// Watched/Watching/On hold/Dropped result shows its state as quiet text
// instead, exactly like Library.
export function SearchResultRow({
  media,
  personalState,
  defaultSaveIntent,
  onNavigate,
}: {
  media: MediaSummary;
  personalState: MediaPersonalState;
  defaultSaveIntent: PlanningIntent;
  // Only ever passed by GlobalSearch's overlay — closes it (and records
  // the recent search) once the title link itself is actually followed.
  // Deliberately not fired by the quick-Save control below: saving
  // shouldn't close the overlay out from under the user.
  onNavigate?: () => void;
}) {
  const poster = posterUrl(media.poster, "small");
  const canSave =
    personalState.kind === "none" ||
    personalState.kind === "watchlist" ||
    personalState.kind === "backlog";
  const intent: PlanningIntent | null =
    personalState.kind === "watchlist" || personalState.kind === "backlog"
      ? personalState.kind
      : null;

  return (
    <div className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface-subtle">
      <Link
        href={mediaHref(media)}
        data-search-result
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        {...(onNavigate ? { onClick: onNavigate } : {})}
      >
        <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-sm bg-surface-subtle sm:w-14">
          {poster ? (
            <Image src={poster} alt="" fill sizes="56px" className="object-cover" />
          ) : (
            <MediaPosterFallback mediaType={media.mediaType} />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-sm font-medium text-foreground">{media.title}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <ResultTypeTag kind={media.mediaType} />
            {media.releaseYear ? <span>· {media.releaseYear}</span> : null}
            {personalState.kind !== "none" ? (
              <>
                <span>·</span>
                <MediaStateHint state={personalState} />
              </>
            ) : null}
          </p>
        </div>
      </Link>

      {canSave ? (
        <PlanningControl
          mediaType={media.mediaType}
          mediaProviderId={media.id}
          intent={intent}
          title={media.title}
          defaultIntent={defaultSaveIntent}
          compact
        />
      ) : null}
    </div>
  );
}
