import { MediaNote } from "@/features/media/media-note";
import { MediaRating } from "@/features/media/media-rating";
import type { MediaOpinion, OpinionMediaType } from "@/server/opinions/types";

// Movie/Show Details' compact personal-opinion cluster — Rating and a
// Note in one restrained row (wraps on mobile), never a generic
// "Your Rating / Your Notes" card with form labels (see docs/opinions.md,
// "Opinion design"). Deliberately no section heading: each control
// carries its own precise accessible name ("Your rating for {title}",
// ...), and sitting directly beside the tracking control already
// supplies the sighted context.
export function MediaOpinionSection({
  mediaType,
  mediaProviderId,
  title,
  opinion,
}: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  title: string;
  opinion: MediaOpinion;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <MediaRating
        mediaType={mediaType}
        mediaProviderId={mediaProviderId}
        title={title}
        rating={opinion.rating}
      />
      <MediaNote
        mediaType={mediaType}
        mediaProviderId={mediaProviderId}
        title={title}
        note={opinion.note}
      />
    </div>
  );
}
