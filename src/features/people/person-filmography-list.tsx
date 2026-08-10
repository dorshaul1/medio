"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PersonFilmographyRow } from "@/features/people/person-filmography-row";
import type { PersonFilmographyEntry } from "@/server/people/types";

const INITIAL_VISIBLE = 12;

// A long career can carry hundreds of credits in one section — all of
// them already arrived in the one combined-credits request (see
// person-filmography.tsx), so "Show more" is a pure client-side reveal,
// never a second provider fetch (see docs/media-provider.md, "Credit
// limit / expansion"). Deliberately bounded, not infinite scroll.
export function PersonFilmographyList({ entries }: { entries: readonly PersonFilmographyEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? entries : entries.slice(0, INITIAL_VISIBLE);
  const remaining = entries.length - visible.length;

  return (
    <div className="flex flex-col">
      <ol className="flex flex-col divide-y divide-border">
        {visible.map((entry) => (
          <PersonFilmographyRow
            key={`${entry.mediaType}-${entry.mediaProviderId}-${entry.role}`}
            entry={entry}
          />
        ))}
      </ol>
      {remaining > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 self-start"
          onClick={() => setExpanded(true)}
        >
          Show {remaining} more
        </Button>
      ) : null}
    </div>
  );
}
