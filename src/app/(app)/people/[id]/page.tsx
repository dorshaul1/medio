import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageContainer } from "@/components/shell/page-container";
import { truncateOverview } from "@/features/media/truncate-overview";
import { parsePersonId } from "@/features/people/parse-person-id";
import { PersonBiography } from "@/features/people/person-biography";
import { PersonFilmographySection } from "@/features/people/person-filmography";
import { PersonFilmographySkeleton } from "@/features/people/person-filmography-skeleton";
import { PersonHeader } from "@/features/people/person-header";
import type { Person } from "@/server/media/types";
import { personAge } from "@/server/people/compose";
import type { CreditRole } from "@/server/people/types";
import { TmdbError } from "@/server/tmdb/errors";
import { profileUrl } from "@/server/tmdb/images";
import { getPersonDetails } from "@/server/tmdb/queries";

const CREDIT_ROLES: readonly CreditRole[] = ["directing", "writing", "producing", "acting"];

function parseCreditFilter(raw: string | string[] | undefined): CreditRole | "all" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (CREDIT_ROLES as readonly string[]).includes(value ?? "") ? (value as CreditRole) : "all";
}

// Person identity (name, photo, biography, birth/death context) is the
// page's primary, blocking content — a fast single `/person/{id}` request,
// and what an invalid/nonexistent id needs to 404 against. Filmography is
// a second, heavier request (potentially hundreds of credits across a long
// career) — Suspense-deferred behind its own section (see
// features/people/person-filmography.tsx), the same reasoning as Movie/Show
// Details' secondary sections.
//
// Deliberately no route-level `loading.tsx` — see the equivalent comment
// on movies/[id]/page.tsx: it would silently downgrade a real 404 (an
// invalid/nonexistent person id) to an HTTP 200.
export default async function PersonPage({ params, searchParams }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const personId = parsePersonId(id);
  if (personId === null) notFound();

  const person = await fetchPerson(personId);
  const age = personAge(person.birthday, person.deathday);
  const activeFilter = parseCreditFilter((await searchParams).credit);

  return (
    <PageContainer>
      <div className="flex flex-col gap-10">
        <PersonHeader person={person} age={age} />
        <PersonBiography biography={person.biography} />
        <Suspense fallback={<PersonFilmographySkeleton />}>
          <PersonFilmographySection person={person} activeFilter={activeFilter} />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function fetchPerson(id: number): Promise<Person> {
  try {
    return await getPersonDetails(id);
  } catch (error) {
    if (error instanceof TmdbError && error.kind === "not_found") {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps<"/people/[id]">): Promise<Metadata> {
  const { id } = await params;
  const personId = parsePersonId(id);
  if (personId === null) return {};

  try {
    const person = await getPersonDetails(personId);
    const description = person.biography ? truncateOverview(person.biography) : undefined;
    const image = profileUrl(person.profile, "large") ?? undefined;

    return {
      title: person.name,
      description,
      openGraph: {
        title: person.name,
        description,
        images: image ? [{ url: image }] : undefined,
      },
    };
  } catch {
    return {};
  }
}
