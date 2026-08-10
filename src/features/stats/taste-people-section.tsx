import type { PersonTasteStat } from "@/server/stats/types";
import { TastePersonTile } from "./taste-person-tile";

// A small curated set of portraits — never a leaderboard table (see
// docs/stats.md, "Person visualization"). Capped upstream at 3 directors
// / 5 actors (server/taste/constants.ts), so a plain wrapping row is
// enough; no horizontal-scroll affordance is needed for a set this small.
function PeopleRow({
  title,
  people,
  roleLabel,
}: {
  title: string;
  people: readonly PersonTasteStat[];
  roleLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap gap-4">
        {people.map((person) => (
          <TastePersonTile
            key={person.personId}
            person={person}
            accessibleContext={`your ${roleLabel}, ${person.averageRating.toFixed(1)} average rating across ${person.ratedTitleCount} rated ${person.ratedTitleCount === 1 ? "title" : "titles"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function TastePeopleSection({
  directors,
  actors,
}: {
  directors: readonly PersonTasteStat[];
  actors: readonly PersonTasteStat[];
}) {
  if (directors.length === 0 && actors.length === 0) return null;

  return (
    <section aria-labelledby="taste-people" className="flex flex-col gap-6">
      <h2 id="taste-people" className="text-lg font-medium tracking-tight">
        Favorite people
      </h2>
      {directors.length > 0 ? (
        <PeopleRow title="Directors" people={directors} roleLabel="favorite director" />
      ) : null}
      {actors.length > 0 ? (
        <PeopleRow title="Actors" people={actors} roleLabel="favorite actor" />
      ) : null}
    </section>
  );
}
