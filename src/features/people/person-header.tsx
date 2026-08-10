import { formatDate } from "@/features/media/format-date";
import { PersonProfileImage } from "@/features/people/person-profile-image";
import type { Person } from "@/server/media/types";

// TMDB's `known_for_department` values, turned into a readable noun
// rather than shown verbatim ("Directing" reads as an activity; "Director"
// reads as who this person is). Anything outside this small set (a niche
// crew department, rare on a page reached via Movie/Show Details'
// intentional actor/director/creator links) falls back to the raw value
// rather than an incomplete lookup table.
const PROFESSION_LABELS: Record<string, string> = {
  Acting: "Actor",
  Directing: "Director",
  Writing: "Writer",
  Production: "Producer",
};

function professionLabel(knownForDepartment: string | null): string | null {
  if (!knownForDepartment) return null;
  return PROFESSION_LABELS[knownForDepartment] ?? knownForDepartment;
}

function birthContext(person: Person, age: number | null): string | null {
  const parts: string[] = [];

  if (person.birthday && person.deathday) {
    const span = `${formatDate(person.birthday)} – ${formatDate(person.deathday)}`;
    parts.push(age !== null ? `${span} (age ${age})` : span);
  } else if (person.deathday) {
    parts.push(`Died ${formatDate(person.deathday)}`);
  } else if (person.birthday) {
    parts.push(
      age !== null
        ? `Born ${formatDate(person.birthday)} (age ${age})`
        : `Born ${formatDate(person.birthday)}`,
    );
  }

  if (person.birthplace) parts.push(person.birthplace);

  return parts.length > 0 ? parts.join(" · ") : null;
}

// A quiet editorial header, not a Movie/Show Details hero with a photo
// substituted for the poster — a person's information hierarchy is
// different (see docs/media-provider.md, "Person header"): no backdrop,
// no metadata line of genres/runtime/rating, just identity and enough
// personal context to place the person before Filmography leads. Personal
// info stays to a single concise line — never a Personal Info sidebar of
// key/value rows (see the same doc, "Relevant personal information
// only").
export function PersonHeader({ person, age }: { person: Person; age: number | null }) {
  const profession = professionLabel(person.knownForDepartment);
  const context = birthContext(person, age);

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
      <PersonProfileImage profile={person.profile} />
      <div className="flex flex-1 flex-col gap-1.5 pt-1">
        <h1 className="text-2xl font-medium tracking-tight text-balance sm:text-3xl">
          {person.name}
        </h1>
        {profession ? <p className="text-sm text-muted-foreground">{profession}</p> : null}
        {context ? <p className="text-sm text-muted-foreground">{context}</p> : null}
      </div>
    </div>
  );
}
