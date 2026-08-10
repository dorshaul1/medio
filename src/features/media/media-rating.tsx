"use client";

import { X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { RatingControl } from "@/components/ui/rating-control";
import { clearMediaRatingAction, setMediaRatingAction } from "@/features/media/opinion-actions";
import type { OpinionMediaType } from "@/server/opinions/types";

const RATING_LABELS = ["Bad", "Weak", "Good", "Great", "Excellent"];

// Movie/Show Details' personal rating — selecting a value persists
// immediately, no Save button (see docs/opinions.md, "Rating
// interaction"). Optimistic: the visible value updates the instant a
// dot is clicked, before the Server Action resolves — clearing/rating
// again is common enough (someone reconsidering 3 → 4 → 5 quickly) that
// waiting for a round trip per click would feel laggy for a control this
// small. `requestId` guards against a slow, now-superseded request
// clobbering a newer one: only the *latest* click's own failure is ever
// allowed to roll the visible value back (see docs/opinions.md, "Rating
// pending state").
export function MediaRating({
  mediaType,
  mediaProviderId,
  title,
  rating,
}: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  title: string;
  rating: number | null;
}) {
  const [value, setValue] = useState(rating);
  const [, startTransition] = useTransition();
  const requestId = useRef(0);

  function select(next: number) {
    const id = ++requestId.current;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      try {
        await setMediaRatingAction(mediaType, mediaProviderId, next);
      } catch {
        if (requestId.current === id) setValue(previous);
      }
    });
  }

  function clear() {
    const id = ++requestId.current;
    const previous = value;
    setValue(null);
    startTransition(async () => {
      try {
        await clearMediaRatingAction(mediaType, mediaProviderId);
      } catch {
        if (requestId.current === id) setValue(previous);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <RatingControl
        value={value}
        onValueChange={select}
        labels={RATING_LABELS}
        aria-label={`Your rating for ${title}`}
      />
      {value !== null ? (
        <IconButton
          aria-label={`Clear your rating for ${title}`}
          variant="ghost"
          size="sm"
          onClick={clear}
        >
          <X />
        </IconButton>
      ) : null}
    </div>
  );
}
