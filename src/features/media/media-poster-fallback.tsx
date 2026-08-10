import { Clapperboard, Tv } from "lucide-react";
import type { MediaType } from "@/server/media/types";

// A missing poster is common (new releases, obscure titles) — this should
// read as an intentional, quiet placeholder, not a broken image. Movie vs.
// show gets a different icon, which also happens to double as a type cue
// when a poster is genuinely missing.
export function MediaPosterFallback({ mediaType }: { mediaType: MediaType }) {
  const Icon = mediaType === "movie" ? Clapperboard : Tv;

  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-subtle">
      <Icon aria-hidden="true" strokeWidth={1.25} className="size-8 text-muted-foreground/60" />
    </div>
  );
}
