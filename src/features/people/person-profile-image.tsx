import { User } from "lucide-react";
import Image from "next/image";
import type { MediaImage } from "@/server/media/types";
import { profileUrl } from "@/server/tmdb/images";

// Portrait-oriented (2:3 — TMDB profile photos are already this shape, so
// nothing is distorted into poster geometry), restrained radius, no
// circular avatar or floating shadow — this is a professional filmography
// page, not an account profile (see docs/design-system.md). A missing
// photo gets the same quiet, product-owned "icon on a muted surface"
// fallback used everywhere else artwork can be missing
// (MediaPosterFallback, CastMemberTile) — never a generic SaaS initials
// avatar — and stays visually secondary. The page's own `<h1>` already
// names the person, so the image's alt stays empty (same convention as
// MediaDetailHero's poster).
export function PersonProfileImage({ profile }: { profile: MediaImage | null }) {
  const image = profileUrl(profile, "large");

  return (
    <div className="w-32 shrink-0 overflow-hidden rounded-md bg-surface-subtle sm:w-44">
      <div className="relative aspect-2/3">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="(min-width: 640px) 176px, 128px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User aria-hidden="true" strokeWidth={1} className="size-12 text-muted-foreground/50" />
          </div>
        )}
      </div>
    </div>
  );
}
