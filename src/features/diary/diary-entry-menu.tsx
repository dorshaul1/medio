"use client";

import { CalendarDays, MoreHorizontal, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { parseDateInputValue, toDateInputValue } from "@/features/media/date-input";
import {
  removeMovieWatchEventAction,
  updateMovieWatchedAtAction,
} from "@/features/movies/movie-tracking-actions";
import {
  removeEpisodeWatchEventAction,
  updateEpisodeWatchedAtAction,
} from "@/features/shows/show-tracking-actions";

// A minimal, discriminated mutation target — exactly the identity
// `updateMovieWatchedAtAction`/`removeMovieWatchEventAction` (or their
// episode equivalents) need, never the full `DiaryEntry` union. Every
// concrete entry component (movie/episode/unavailable) already knows
// which shape it has; this menu only needs to know *which mutation
// path* to call, never whether hydration happened to succeed for that
// entry — see docs/diary.md, "Unified event references".
export type DiaryMutationTarget =
  | { eventType: "movie"; id: string; movieProviderId: number; watchedAt: Date }
  | {
      eventType: "episode";
      id: string;
      showProviderId: number;
      seasonNumber: number;
      watchedAt: Date;
    };

// Diary's one contextual menu — Edit watch date / Delete — shared by
// every entry shape (an unavailable entry still has real identity, just
// no title/artwork to show — see docs/diary.md, "Provider failure").
// Dispatches to the exact same per-event-type mutation
// `MovieTrackingControl`/`EpisodeWatchControl` already call
// (`features/movies/movie-tracking-actions.ts` /
// `features/shows/show-tracking-actions.ts`) — no parallel mutation path
// (see CLAUDE.md, "Diary"). Both dialogs follow the same
// Dialog-triggered-from-a-DropdownMenuItem pattern
// `ShowTrackingControl`'s "Reset progress" confirmation already
// established, rather than nesting a Popover inside a closing menu.
export function DiaryEntryMenu({
  target,
  accessibleName,
}: {
  target: DiaryMutationTarget;
  // A precise per-entry description ("Fight Club, watched Aug 7") — see
  // CLAUDE.md, "Icon-only controls require a precise, contextual
  // accessible name".
  accessibleName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(target.watchedAt);
  const [dateText, setDateText] = useState(() => toDateInputValue(target.watchedAt));

  function openEdit() {
    setSelectedDate(target.watchedAt);
    setDateText(toDateInputValue(target.watchedAt));
    setEditOpen(true);
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

  function confirmEdit() {
    if (!selectedDate) return;
    // Only the calendar date changes — the original local time of day
    // is preserved rather than reset to midnight/noon, so a correction
    // never silently invents a time nobody entered (see docs/diary.md,
    // "Edit date precision").
    const original = target.watchedAt;
    const watchedAt = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      original.getHours(),
      original.getMinutes(),
      original.getSeconds(),
    );
    setEditOpen(false);
    startTransition(async () => {
      if (target.eventType === "movie") {
        await updateMovieWatchedAtAction(target.id, target.movieProviderId, watchedAt);
      } else {
        await updateEpisodeWatchedAtAction({
          eventId: target.id,
          showProviderId: target.showProviderId,
          seasonNumber: target.seasonNumber,
          watchedAt,
        });
      }
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      if (target.eventType === "movie") {
        await removeMovieWatchEventAction(target.id, target.movieProviderId);
      } else {
        await removeEpisodeWatchEventAction({
          eventId: target.id,
          showProviderId: target.showProviderId,
          seasonNumber: target.seasonNumber,
        });
      }
      setDeleteOpen(false);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            aria-label={`More actions for ${accessibleName}`}
            variant="ghost"
            size="sm"
            disabled={isPending}
          >
            <MoreHorizontal />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={openEdit}>
            <CalendarDays />
            Edit watch date
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit watch date</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="diary-edit-date" className="text-sm font-medium text-foreground">
                Watched on
              </label>
              <Input
                id="diary-edit-date"
                value={dateText}
                onChange={(event) => editDateText(event.target.value)}
                placeholder="YYYY-MM-DD"
                className="font-mono tabular-nums"
              />
            </div>
            <Calendar selected={selectedDate} onSelect={selectDate} maxDate={new Date()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEdit} disabled={!selectedDate || isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this entry?</DialogTitle>
            <DialogDescription>
              This removes this one viewing from your history. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} loading={isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
