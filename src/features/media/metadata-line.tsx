import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// The "·"-separated identity metadata row shared by Movie and Show
// Details (year · runtime/scale · rating · genres, in whatever order and
// combination each caller builds) — each part is independently optional,
// so callers build an ordered list of nodes rather than a
// conditionally-joined template string. `className` exists so a caller
// can render two breakpoint-specific variants of the same line (see
// Movie/Show Hero, "genres joins the line on desktop, stays a separate
// line on mobile") without a client-only viewport check.
export function MetadataLine({
  parts,
  className,
}: {
  parts: readonly ReactNode[];
  className?: string;
}) {
  if (parts.length === 0) return null;

  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground", className)}>
      {parts.map((part, index) => (
        // A static-length metadata line built from the caller's own
        // fields, never reordered — the index key exception applies.
        // biome-ignore lint/suspicious/noArrayIndexKey: static metadata line, never reordered
        <span key={index} className="inline-flex items-center gap-1.5">
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          {part}
        </span>
      ))}
    </p>
  );
}

// TMDB's provider rating as a metadata-line part — a 0 means "no votes
// on file", not a real zero score, so callers should skip this entirely
// rather than call it with a 0.
export function providerRatingPart(rating: number): ReactNode {
  return (
    <span key="rating" className="inline-flex items-center gap-1">
      <Star aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
      {rating.toFixed(1)}
    </span>
  );
}
