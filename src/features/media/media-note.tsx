"use client";

import { NotebookPen } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Textarea } from "@/components/ui/textarea";
import { clearMediaNoteAction, setMediaNoteAction } from "@/features/media/opinion-actions";
import type { OpinionMediaType } from "@/server/opinions/types";
import { NOTE_MAX_LENGTH } from "@/server/opinions/types";

// Movie/Show Details' private note. No permanent Textarea on the page —
// unset shows a bare icon affordance ("Add a note"); set shows a quiet
// truncated preview that opens the same editor (see docs/opinions.md,
// "Note interaction"). Editing happens in a focused Dialog with an
// explicit Save/Cancel — unlike Rating/Reactions, free text genuinely
// benefits from a server-confirmed save rather than persisting on every
// keystroke (see docs/opinions.md, "Auto save vs explicit save"), so
// this is the one place in the opinion layer a real text `Button` is
// correct rather than icon-first.
export function MediaNote({
  mediaType,
  mediaProviderId,
  title,
  note,
}: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  title: string;
  note: string | null;
}) {
  const [currentNote, setCurrentNote] = useState(note);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [isPending, startTransition] = useTransition();

  function openEditor() {
    setDraft(currentNote ?? "");
    setOpen(true);
  }

  // A closed Dialog with unsaved changes (typed text that was never
  // saved) is real, easily-lost work — a plain confirm is enough
  // protection without a second custom confirmation surface (see
  // docs/opinions.md, "Unsaved changes").
  function handleOpenChange(next: boolean) {
    if (!next && !isPending && draft.trim() !== (currentNote ?? "").trim()) {
      if (!window.confirm("Discard your changes?")) return;
    }
    setOpen(next);
  }

  function save() {
    startTransition(async () => {
      const result = await setMediaNoteAction(mediaType, mediaProviderId, draft);
      setCurrentNote(result?.content ?? null);
      setOpen(false);
    });
  }

  function remove() {
    startTransition(async () => {
      await clearMediaNoteAction(mediaType, mediaProviderId);
      setCurrentNote(null);
      setOpen(false);
    });
  }

  return (
    <>
      {currentNote ? (
        <button
          type="button"
          onClick={openEditor}
          className="line-clamp-2 max-w-md rounded-md text-left text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {currentNote}
        </button>
      ) : (
        <IconButton
          aria-label={`Add a note about ${title}`}
          variant="ghost"
          size="sm"
          onClick={openEditor}
        >
          <NotebookPen />
        </IconButton>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentNote ? "Edit note" : "Add a note"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="media-note-content" className="sr-only">
              Your note about {title}
            </label>
            <Textarea
              id="media-note-content"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={NOTE_MAX_LENGTH}
              rows={6}
              placeholder="Private — only you can see this."
              autoFocus
              className="resize-none"
            />
            <p className="text-right text-xs text-muted-foreground">
              {draft.length} / {NOTE_MAX_LENGTH}
            </p>
          </div>
          <DialogFooter className="sm:justify-between">
            {currentNote ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={remove}
                disabled={isPending}
                className="self-start"
              >
                Delete
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={save} loading={isPending} disabled={draft.trim().length === 0}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
