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
import { clearMediaCommentAction, setMediaCommentAction } from "@/features/media/comment-actions";
import type { OpinionMediaType } from "@/server/opinions/types";
import { COMMENT_MAX_LENGTH } from "@/server/opinions/types";

// Movie/Show Details' private comment — gated on having actually watched
// (even partially) the title, same as the rest of the tracking-adjacent
// action row (see docs/opinions.md). No permanent Textarea on the page —
// unset shows a bare icon affordance ("Add a comment"); set shows a
// quiet truncated preview that opens the same editor (see
// docs/opinions.md, "Comment interaction"). Editing happens in a focused
// Dialog with an explicit Save/Cancel — free text genuinely benefits
// from a server-confirmed save rather than persisting on every
// keystroke (see docs/opinions.md, "Auto save vs explicit save"), so
// this is the one place in the opinion layer a real text `Button` is
// correct rather than icon-first.
export function MediaComment({
  mediaType,
  mediaProviderId,
  title,
  comment,
}: {
  mediaType: OpinionMediaType;
  mediaProviderId: number;
  title: string;
  comment: string | null;
}) {
  const [currentComment, setCurrentComment] = useState(comment);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(comment ?? "");
  const [isPending, startTransition] = useTransition();

  function openEditor() {
    setDraft(currentComment ?? "");
    setOpen(true);
  }

  // A closed Dialog with unsaved changes (typed text that was never
  // saved) is real, easily-lost work — a plain confirm is enough
  // protection without a second custom confirmation surface (see
  // docs/opinions.md, "Unsaved changes").
  function handleOpenChange(next: boolean) {
    if (!next && !isPending && draft.trim() !== (currentComment ?? "").trim()) {
      if (!window.confirm("Discard your changes?")) return;
    }
    setOpen(next);
  }

  function save() {
    startTransition(async () => {
      const result = await setMediaCommentAction(mediaType, mediaProviderId, draft);
      setCurrentComment(result?.content ?? null);
      setOpen(false);
    });
  }

  function remove() {
    startTransition(async () => {
      await clearMediaCommentAction(mediaType, mediaProviderId);
      setCurrentComment(null);
      setOpen(false);
    });
  }

  return (
    <>
      {currentComment ? (
        <button
          type="button"
          onClick={openEditor}
          className="w-full rounded-md text-left text-sm whitespace-pre-wrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-md"
        >
          {currentComment}
        </button>
      ) : (
        <IconButton
          aria-label={`Add a comment about ${title}`}
          variant="ghost"
          onClick={openEditor}
        >
          <NotebookPen />
        </IconButton>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentComment ? "Edit comment" : "Add a comment"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="media-comment-content" className="sr-only">
              Your comment about {title}
            </label>
            <Textarea
              id="media-comment-content"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={COMMENT_MAX_LENGTH}
              rows={6}
              placeholder="Private — only you can see this."
              autoFocus
              className="resize-none"
            />
            <p className="text-right text-xs text-muted-foreground">
              {draft.length} / {COMMENT_MAX_LENGTH}
            </p>
          </div>
          <DialogFooter className="sm:justify-between">
            {currentComment ? (
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
