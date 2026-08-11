import type { LibraryStateGroup } from "@/server/library/types";

// Labels for the Library's default-view clustering (see
// `groupLibraryItems`, server/library/types.ts) — quiet section
// separators, not a wall of tabs. Deliberately the same four labels
// regardless of media type: "Finished" reads correctly for both a
// Completed show and a Watched movie, so this doesn't need to branch on
// `mediaType` for a mixed "All" view.
const GROUP_LABELS: Record<LibraryStateGroup, string> = {
  in_progress: "Continuing",
  planned: "Planned",
  paused: "Paused",
  finished: "Finished",
};

// A restrained overline, not a bordered/backgrounded section card — see
// CLAUDE.md, "Composition before containers". No item count: the group
// itself is already the signal; a number beside every section would be
// exactly the "competing counts" clutter docs/library.md's product spec
// warns against.
export function LibrarySectionHeading({ group }: { group: LibraryStateGroup }) {
  return (
    <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {GROUP_LABELS[group]}
    </h2>
  );
}
