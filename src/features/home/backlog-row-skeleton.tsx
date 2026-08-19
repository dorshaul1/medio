import { MediaCollectionRowSkeleton } from "@/features/media/media-collection-row-skeleton";

// `BacklogRowSection`'s Suspense fallback — matches `BacklogTile`'s real
// shape (`rounded-md` posters, no progress line).
export function BacklogRowSkeleton() {
  return <MediaCollectionRowSkeleton title="From your Backlog" size="cozy" radius="md" count={4} />;
}
