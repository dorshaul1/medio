import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { personHref } from "@/features/media/person-route";
import type { MediaImage } from "@/server/media/types";
import { posterUrl } from "@/server/tmdb/images";

// Deliberately generic, not `CastMember`-typed — Movie Details' cast
// (CastMember) and Show Details' aggregate cast (ShowCastMember, which
// also carries an episode count this tile doesn't show) both structurally
// satisfy this. The whole tile is one link to `/people/[id]` (see
// docs/architecture.md, "People") — not a static card with a separate
// "View person" affordance stacked on top. The image's alt stays "" since
// the name below already supplies the link's accessible name (same
// convention as MediaPoster).
export function CastMemberTile({
  member,
}: {
  member: { id: number; name: string; character: string; profile: MediaImage | null };
}) {
  const profile = posterUrl(member.profile, "small");

  return (
    <Link
      href={personHref(member.id)}
      className="group block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex flex-col gap-2">
        <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-surface-subtle">
          {profile ? (
            <Image
              src={profile}
              alt=""
              fill
              sizes="(min-width: 640px) 128px, 96px"
              className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User
                aria-hidden="true"
                strokeWidth={1.25}
                className="size-8 text-muted-foreground/60"
              />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="line-clamp-1 text-sm font-medium text-foreground transition-colors group-hover:text-foreground/80 group-focus-visible:text-foreground/80">
            {member.name}
          </p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{member.character}</p>
        </div>
      </div>
    </Link>
  );
}
