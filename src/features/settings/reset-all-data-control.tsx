"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { resetAllDataAction } from "./dev-tools-actions";

const CONFIRM_WORD = "RESET";

// The one genuinely destructive control in this app that deletes more
// than a single event/entry (see docs/settings.md, "Developer tools") —
// a real, permanent, irreversible wipe of everything this account has
// tracked. A typed confirmation, not just a confirm dialog, matches the
// scale of what's being deleted; General's own "Reset preferences" is
// far narrower and only needs the lighter confirm-dialog pattern.
export function ResetAllDataControl() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  function closeDialog(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  function reset() {
    startTransition(async () => {
      try {
        await resetAllDataAction();
        closeDialog(false);
        setDone(true);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Reset all data
      </Button>
      {done ? <p className="text-xs text-muted-foreground">All data cleared.</p> : null}
      {failed ? <p className="text-xs text-destructive">Something went wrong.</p> : null}

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all data?</DialogTitle>
            <DialogDescription>
              This permanently deletes every movie and episode you've watched, every rating and
              note, your Watchlist and Backlog, and all preferences for this account. Your account
              itself is kept. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reset-all-data-confirm" className="text-sm font-medium text-foreground">
              Type {CONFIRM_WORD} to confirm
            </label>
            <Input
              id="reset-all-data-confirm"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={reset}
              disabled={confirmText !== CONFIRM_WORD || isPending}
              loading={isPending}
            >
              Reset all data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
