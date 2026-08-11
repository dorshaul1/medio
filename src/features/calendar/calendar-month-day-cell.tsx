import { Clapperboard, Tv } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MonthDayCell } from "@/server/calendar/month-grid";
import type { ReleaseEvent } from "@/server/calendar/types";
import { backdropUrl, posterUrl } from "@/server/tmdb/images";

function releaseTitle(event: ReleaseEvent): string {
  return event.kind === "episode" ? event.showTitle : event.movieTitle;
}

// The screen-reader-only counterpart to the artwork/icons below — a
// sighted user sees them directly in the cell; this says the same thing
// in words.
function cellIndicatorLabel(events: readonly ReleaseEvent[]): string {
  if (events.length === 1) {
    const [event] = events;
    return event ? `, ${releaseTitle(event)}` : "";
  }
  const hasEpisode = events.some((event) => event.kind === "episode");
  const hasMovie = events.some((event) => event.kind === "movieRelease");
  const kinds = [hasEpisode ? "TV" : null, hasMovie ? "movie" : null].filter(
    (kind): kind is string => kind !== null,
  );
  return kinds.length > 0 ? `, ${kinds.join(" and ")} release` : "";
}

// One day cell in the compact month grid. A day with exactly one release
// always names that title directly in the cell; when TMDB has a
// backdrop or poster for it, that art becomes the cell's own full-bleed
// background too — same "real artwork, fixed dark scrim, fixed white
// text" language `UpNextCard`/`part-of-collection-row.tsx` already use
// for floating text over unpredictable art in either theme. Missing
// artwork is a real, common case (see CLAUDE.md, "Missing artwork must
// be an intentionally designed fallback") — the title still shows, just
// on a plain themed background instead of a photo. A day with more than
// one release has no single title to anchor either treatment to (see
// docs/calendar.md, "Month view artwork") — it falls back to the small
// Tv/Clapperboard kind icons instead. Only the show's own identity is
// ever named here, never a specific episode's title — the same
// spoiler-safety reasoning `UpNextCard` documents for Home's Up Next,
// and there's no room for a spoiler reveal control at this size anyway.
export function CalendarMonthDayCell({
  cell,
  events,
  isSelected,
  dateLabel,
  onSelect,
}: {
  cell: MonthDayCell;
  events: readonly ReleaseEvent[];
  isSelected: boolean;
  dateLabel: string;
  onSelect: () => void;
}) {
  const single = events.length === 1 ? events[0] : undefined;
  const art = single
    ? (backdropUrl(single.backdrop, "medium") ?? posterUrl(single.poster, "medium"))
    : null;
  const hasEpisode = events.some((event) => event.kind === "episode");
  const hasMovie = events.some((event) => event.kind === "movieRelease");
  const dayNumber = Number(cell.date.slice(-2));

  // The ring only ever marks the *selected* day, not merely "today" —
  // today still gets its own quiet cue (the primary-colored day number
  // below), but doesn't earn a permanent border just for being today.
  // It's independent of background treatment otherwise — same ring
  // whether the cell has real artwork, a plain single-release tint, or
  // is empty. Deliberately *not* `ring-inset`: an inset ring is a box-
  // shadow painted inside the button's own box, which an art cell's
  // absolutely-positioned Image/scrim (later children, painting above
  // the button's own background/shadow layer) would visually cover
  // entirely. A normal (outer) ring paints outside the border box, where
  // those `inset-0` children never extend to — never covered, on every
  // cell kind (see docs/calendar.md, "Month view artwork").
  const monthTextClass = cell.inCurrentMonth ? "text-foreground" : "text-muted-foreground/40";
  const baseStateClass = art
    ? ""
    : single
      ? cn(monthTextClass, "bg-primary/5 hover:bg-primary/10")
      : cn(monthTextClass, isSelected ? "bg-primary/10" : "hover:bg-muted");

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={`${dateLabel}${cellIndicatorLabel(events)}`}
      onClick={onSelect}
      className={cn(
        "relative flex h-16 flex-col overflow-hidden rounded-md p-1 text-left outline-none transition-colors select-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-20 sm:p-1.5",
        baseStateClass,
        isSelected && "ring-2 ring-primary",
      )}
    >
      {art ? (
        <>
          <Image
            src={art}
            alt=""
            fill
            sizes="(min-width: 640px) 96px, 64px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
        </>
      ) : null}

      <span
        className={cn(
          "relative text-sm font-medium tabular-nums",
          art ? "text-white" : cell.isToday && "text-primary",
        )}
      >
        {dayNumber}
      </span>

      {single ? (
        <span
          className={cn(
            "relative mt-auto line-clamp-2 text-[10px] leading-tight font-medium",
            art ? "text-white" : "text-foreground/80",
          )}
        >
          {releaseTitle(single)}
        </span>
      ) : hasEpisode || hasMovie ? (
        <span
          aria-hidden="true"
          className="relative mt-auto flex items-center gap-0.5 text-primary"
        >
          {hasEpisode ? <Tv className="size-3" strokeWidth={2} /> : null}
          {hasMovie ? <Clapperboard className="size-3" strokeWidth={2} /> : null}
        </span>
      ) : null}
    </button>
  );
}
