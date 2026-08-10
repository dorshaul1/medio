import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { personHref } from "@/features/media/person-route";
import type { PersonTasteStat } from "@/server/stats/types";
import { profileUrl } from "@/server/tmdb/images";

// A curated portrait tile for a Favorite Director/Actor — deliberately
// not `CastMemberTile` reused as-is: the supporting fact here is the
// user's own rating evidence ("4.8 avg · 3 movies"), never a character
// name, so this is its own small composition (see docs/stats.md,
// "Person visualization"). The whole tile links to `/people/[id]` — the
// same real navigation every other actor/director credit in this app
// uses, never a separate Taste-person page.
export function TastePersonTile({
  person,
  accessibleContext,
}: {
  person: PersonTasteStat;
  accessibleContext: string;
}) {
  const profile = profileUrl(person.profile, "medium");

  return (
    <Link
      href={personHref(person.personId)}
      aria-label={`${person.name}, ${accessibleContext} — view profile`}
      className="group flex w-24 shrink-0 flex-col gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-28"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-surface-subtle">
        {profile ? (
          <Image
            src={profile}
            alt=""
            fill
            sizes="(min-width: 640px) 112px, 96px"
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
          {person.name}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground" aria-hidden="true">
          {person.averageRating.toFixed(1)} avg · {person.ratedTitleCount}{" "}
          {person.ratedTitleCount === 1 ? "title" : "titles"}
        </p>
      </div>
    </Link>
  );
}
