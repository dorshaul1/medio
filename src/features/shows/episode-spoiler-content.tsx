"use client";

import { Eye, Tv } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import type { SpoilerDecision } from "@/server/spoilers/policy";

// The one place an episode's still/title/overview actually render — see
// docs/settings.md, "Spoiler protection". A restrained, local reveal:
// clicking "Show details" only affects this one row, in this one
// render, and never changes the global Spoiler protection preference
// (see docs/settings.md, "Reveal spoiler content"). The real content is
// always in the initial payload (this isn't a security boundary, just a
// courtesy against accidentally reading ahead) — hiding it is a client-
// side render decision, not a server omission, so revealing needs no
// round trip.
export function EpisodeSpoilerContent({
  episodeNumber,
  title,
  overview,
  stillUrl: still,
  meta,
  decision,
  watched,
  isNext = false,
}: {
  episodeNumber: number;
  title: string;
  overview: string | null;
  stillUrl: string | null;
  meta: readonly string[];
  decision: SpoilerDecision;
  watched: boolean;
  isNext?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const isHidden = (decision.hideIdentity || decision.hideOverview) && !revealed;
  const hideIdentity = decision.hideIdentity && !revealed;

  return (
    <>
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-surface-subtle sm:w-48">
        {hideIdentity ? (
          <div className="flex h-full w-full items-center justify-center">
            <Tv aria-hidden="true" strokeWidth={1.25} className="size-6 text-muted-foreground/40" />
          </div>
        ) : still ? (
          <Image
            src={still}
            alt=""
            fill
            sizes="(min-width: 640px) 192px, 112px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Tv aria-hidden="true" strokeWidth={1.25} className="size-6 text-muted-foreground/60" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3
          aria-label={isNext && !hideIdentity ? `${title} — Next episode` : undefined}
          className={cn(
            "text-sm font-medium text-balance sm:text-base",
            watched ? "text-foreground/70" : "text-foreground",
          )}
        >
          {hideIdentity ? `Episode ${episodeNumber}` : title}
        </h3>

        {meta.length > 0 ? (
          <p className="text-xs text-muted-foreground sm:text-sm">{meta.join(" · ")}</p>
        ) : null}

        {overview && !isHidden ? (
          <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{overview}</p>
        ) : null}

        {isHidden ? (
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-muted-foreground italic sm:text-sm">
              Hidden by spoiler settings
            </p>
            <IconButton
              aria-label={`Show details for episode ${episodeNumber}`}
              variant="ghost"
              size="sm"
              onClick={() => setRevealed(true)}
            >
              <Eye />
            </IconButton>
          </div>
        ) : null}
      </div>
    </>
  );
}
