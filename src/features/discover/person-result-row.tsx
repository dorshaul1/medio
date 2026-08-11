import { User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ResultTypeTag } from "@/features/discover/result-type-tag";
import { personHref } from "@/features/media/person-route";
import type { PersonSummary } from "@/server/media/types";
import { posterUrl } from "@/server/tmdb/images";

// TMDB's own department names, normalized into the natural noun a
// person's own profession reads as ("Acting" -> "Actor") — the same
// "raw provider string never reaches UI unmapped" discipline
// server/people/compose.ts already applies to Filmography grouping.
// Unmapped/unknown departments fall back to the raw string rather than
// disappearing.
const DEPARTMENT_LABEL: Record<string, string> = {
  Acting: "Actor",
  Directing: "Director",
  Writing: "Writer",
  Production: "Producer",
  Editing: "Editor",
  Sound: "Sound",
  Camera: "Cinematographer",
};

// People are first-class Unified Search results — the same row shell/
// scale as a Movie/Show result (see search-result-row.tsx), not a
// smaller secondary treatment, and not the raw round "profile" crop — a
// fixed 2:3 frame matches the poster rows beside it, so the eye doesn't
// hitch on People switching aspect ratio mid-list. `knownFor` (up to two
// titles, already present on the same `/search/person` response — see
// docs/media-provider.md) gives just enough disambiguating context to
// recognize the right "John Smith" without an extra fetch.
export function PersonResultRow({
  person,
  onNavigate,
}: {
  person: PersonSummary;
  // See SearchResultRow's identical prop — only ever passed by
  // GlobalSearch's overlay.
  onNavigate?: () => void;
}) {
  const portrait = posterUrl(person.profile, "small");
  const knownFor = person.knownFor.slice(0, 2);
  const departmentLabel = person.knownForDepartment
    ? (DEPARTMENT_LABEL[person.knownForDepartment] ?? person.knownForDepartment)
    : null;

  return (
    <Link
      href={personHref(person.id)}
      data-search-result
      className="group flex items-center gap-3 rounded-md p-2 outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      {...(onNavigate ? { onClick: onNavigate } : {})}
    >
      <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-sm bg-surface-subtle sm:w-14">
        {portrait ? (
          <Image src={portrait} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-subtle">
            <User
              aria-hidden="true"
              strokeWidth={1.25}
              className="size-8 text-muted-foreground/60"
            />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground">{person.name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ResultTypeTag kind="person" />
          {departmentLabel ? <span> · {departmentLabel}</span> : null}
        </p>
        {knownFor.length > 0 ? (
          <p className="truncate text-xs text-muted-foreground">
            {knownFor.map((item) => item.title).join(", ")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
