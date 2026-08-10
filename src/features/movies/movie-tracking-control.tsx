"use client";

import { CalendarDays, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseDateInputValue, toDateInputValue } from "@/features/media/date-input";
import { formatDate, formatDateTime } from "@/features/media/format-date";
import type { MovieWatchEvent, MovieWatchSummary } from "@/server/tracking/types";
import { markMovieWatchedAction, removeMovieWatchEventAction } from "./movie-tracking-actions";

// Movie Details' one personal action. Clay only for the primary
// never-watched state — once watched, the control becomes a quiet
// secondary pill, so tracking never visually competes with the movie
// itself (see docs/tracking.md and CLAUDE.md, "Tracking"). "Watched" is
// never a toggle: the dropdown's "Watch again" always records another
// event, and removing a specific past entry from history never clears
// the others.
//
// Backdating pairs a real month-grid `Calendar` with a typeable text
// input, kept in sync with each other — not the browser's own native
// `<input type="date">` (entirely OS/browser-styled, foreign next to the
// rest of the product) and not the calendar alone (some users would
// rather type a known date than click through months). The popover
// trigger reuses the exact same bare-icon treatment as Planning's own
// Save control (`IconButton`, `variant="ghost"`, the default size —
// matching the row's other `h-9` buttons so nothing shifts height when
// Planning's control disappears once watched — wrapped in a `Tooltip`) —
// one consistent "small secondary icon action" language across Movie
// Details, not a one-off.
//
// Deliberately NOT optimistic. An earlier version of this control showed
// "Watched" instantly via `useOptimistic`, before the Server Action's
// real insert had actually landed — a real user (or e2e test) reloading
// or navigating away in that brief window could lose the watch event
// entirely, because the in-flight request doesn't survive the
// navigation. Watch history is user-owned data we can't afford to be
// wrong about (see CLAUDE.md, "Product principles"), so the visible
// state only ever reflects what the server actually confirmed. What this
// control drops instead is the old heavy spinner/dimmed-button
// treatment — no `loading` prop, buttons stay fully legible the whole
// time — since on a normal connection the real round trip is fast enough
// that the gap reads as responsive, not stalled.
export function MovieTrackingControl({
  movieProviderId,
  summary,
  events,
  hasReleased,
}: {
  movieProviderId: number;
  summary: MovieWatchSummary;
  events: readonly MovieWatchEvent[];
  // Whether the movie's own release date has passed — see
  // features/media/has-released.ts. A movie can't honestly be marked
  // watched before it exists; real history (e.g. an early/festival
  // screening) always takes priority over this if it's somehow present.
  hasReleased: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateText, setDateText] = useState("");

  function markWatchedNow() {
    startTransition(async () => {
      await markMovieWatchedAction(movieProviderId);
    });
  }

  function setDatePopover(open: boolean) {
    setDatePopoverOpen(open);
    if (!open) {
      setSelectedDate(null);
      setDateText("");
    }
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setDateText(toDateInputValue(date));
  }

  function editDateText(value: string) {
    setDateText(value);
    const parsed = parseDateInputValue(value);
    if (parsed) setSelectedDate(parsed);
  }

  function confirmWatchedOnDate() {
    if (!selectedDate) return;
    const watchedAt = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      12,
    );
    setDatePopover(false);
    startTransition(async () => {
      await markMovieWatchedAction(movieProviderId, watchedAt);
    });
  }

  function removeEvent(eventId: string) {
    startTransition(async () => {
      await removeMovieWatchEventAction(eventId, movieProviderId);
    });
  }

  if (!summary.hasWatched && !hasReleased) {
    return <span className="text-sm text-muted-foreground">Not yet released</span>;
  }

  if (!summary.hasWatched) {
    return (
      <div className="flex items-center gap-1.5">
        <Button onClick={markWatchedNow} disabled={isPending}>
          Mark watched
        </Button>
        <Popover open={datePopoverOpen} onOpenChange={setDatePopover}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <IconButton aria-label="Mark watched on another date" variant="ghost">
                  <CalendarDays />
                </IconButton>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Watched on another date</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-auto">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="movie-watched-date" className="text-sm font-medium text-foreground">
                  Watched on
                </label>
                <Input
                  id="movie-watched-date"
                  value={dateText}
                  onChange={(event) => editDateText(event.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="font-mono tabular-nums"
                />
              </div>
              <Calendar selected={selectedDate} onSelect={selectDate} maxDate={new Date()} />
              <Button
                size="sm"
                onClick={confirmWatchedOnDate}
                disabled={!selectedDate || isPending}
              >
                Mark watched
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" disabled={isPending}>
            <Check />
            {summary.watchCount === 1 ? "Watched" : `Watched ${summary.watchCount} times`}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={markWatchedNow}>Watch again</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>History</DropdownMenuLabel>
          {events.map((event) => (
            <DropdownMenuItem key={event.id} onSelect={() => removeEvent(event.id)}>
              Remove {formatDateTime(event.watchedAt)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {summary.lastWatchedAt ? (
        <span className="text-xs text-muted-foreground">
          Last watched {formatDate(summary.lastWatchedAt)}
        </span>
      ) : null}
    </div>
  );
}
