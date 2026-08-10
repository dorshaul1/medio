import { PersonFilmographyFilter } from "@/features/people/person-filmography-filter";
import { PersonFilmographyList } from "@/features/people/person-filmography-list";
import { PersonKnownForRow } from "@/features/people/person-known-for-row";
import type { Person } from "@/server/media/types";
import { buildFilmographySections, selectKnownFor } from "@/server/people/compose";
import type { CreditRole } from "@/server/people/types";
import { getPersonCombinedCredits } from "@/server/tmdb/queries";

// The Filmography section's own fetch + compose + render — Suspense-
// deferred from the page (see its comment): the person's identity
// (name/photo/biography) renders immediately, and this potentially large
// (hundreds of credits for a prolific career) combined-credits fetch
// streams in independently. Its own failure boundary too, same pattern as
// MovieRecommendations/ShowCastRow: a Filmography failure degrades to
// "can't load right now" rather than breaking the identity content above
// it.
export async function PersonFilmographySection({
  person,
  activeFilter,
}: {
  person: Person;
  activeFilter: CreditRole | "all";
}) {
  try {
    const credits = await getPersonCombinedCredits(person.id);
    const sections = buildFilmographySections(person, credits);
    const knownFor = selectKnownFor(credits.cast, credits.crew);

    if (sections.length === 0) {
      return knownFor.length > 0 ? <PersonKnownForRow items={knownFor} /> : null;
    }

    const roles = sections.map((section) => section.role);
    const filter = roles.includes(activeFilter as CreditRole) ? activeFilter : "all";
    const visibleSections =
      filter === "all" ? sections : sections.filter((section) => section.role === filter);
    // Sub-headings only earn their place once more than one section is on
    // screen at once — a lone Acting section under "Filmography" doesn't
    // need "Acting" repeated right below it.
    const showSubheadings = roles.length > 1 && filter === "all";

    return (
      <div className="flex flex-col gap-8">
        <PersonKnownForRow items={knownFor} />

        <section aria-labelledby="person-filmography" className="flex flex-col gap-4">
          <h2 id="person-filmography" className="text-lg font-medium tracking-tight">
            Filmography
          </h2>

          {roles.length > 1 ? (
            <PersonFilmographyFilter personId={person.id} roles={roles} active={filter} />
          ) : null}

          <div className="flex flex-col gap-6">
            {visibleSections.map((section) => (
              <div key={section.role} className="flex flex-col gap-2">
                {showSubheadings ? (
                  <h3 className="text-sm font-medium text-muted-foreground">{section.label}</h3>
                ) : null}
                <PersonFilmographyList entries={section.entries} />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  } catch {
    return (
      <p className="text-sm text-muted-foreground">Couldn&apos;t load filmography right now.</p>
    );
  }
}
