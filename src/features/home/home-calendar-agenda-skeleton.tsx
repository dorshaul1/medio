import { Skeleton } from "@/components/ui/skeleton";
import type { HomeCalendarAgendaSize } from "@/server/home/layout";

// Matches `CalendarEventRow`'s real shape (`w-12 sm:w-14` poster, then a
// `gap-0.5` text stack: text-sm title → `h-5`, text-xs meta → `h-4`) —
// the exact bar heights the real `<p>` line-heights resolve to, not
// rounder decorative numbers, so there's no jump the moment real content
// replaces it. Used by both the Balanced layout's compact "Coming up"
// teaser and the Calendar layout's fuller "New & upcoming" agenda.
// Subsection labels (Today/This week/Later) aren't reproduced here: which
// of those actually has anything is entirely data-dependent, so a
// skeleton that commits to all three risks promising a shape the real
// agenda won't have — a plain row list reads as "loading a list" either
// way without overcommitting to a structure.
function AgendaRowSkeleton() {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Skeleton className="aspect-2/3 w-12 shrink-0 rounded-md sm:w-14" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Skeleton className="h-5 w-2/3 rounded-sm" />
        <Skeleton className="h-4 w-1/3 rounded-sm" />
      </div>
    </li>
  );
}

export function HomeCalendarAgendaSkeleton({
  size,
}: {
  size: Exclude<HomeCalendarAgendaSize, "none">;
}) {
  const heading = size === "preview" ? "Coming up" : "New & upcoming";
  const rowCount = size === "preview" ? 3 : 5;

  return (
    // `gap-3` (preview) / `gap-6` (full) copies `HomeCalendarAgendaView`'s
    // own two branches exactly — the full agenda's real outer section
    // uses a taller gap since it normally separates several Today/This
    // week/Later subsections, not one flat list.
    <section className={size === "preview" ? "flex flex-col gap-3" : "flex flex-col gap-6"}>
      <h2 className="text-lg font-medium tracking-tight">{heading}</h2>
      <ul className="flex flex-col divide-y divide-border">
        {Array.from({ length: rowCount }, (_, index) => (
          // A static-length placeholder list that never reorders — index
          // keys are the documented exception, not real data.
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
          <AgendaRowSkeleton key={index} />
        ))}
      </ul>
    </section>
  );
}
