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
import { resetPreferencesAction } from "./settings-actions";

// A lightweight confirmation (this changes several preferences at once)
// but a calm one, not an alarming destructive-action treatment — this
// never touches watch history, ratings, notes, planning, or the account
// itself (see docs/settings.md, "Reset preferences"), so a plain
// `Button`, never `variant="destructive"`.
export function ResetPreferencesControl() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      await resetPreferencesAction();
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Reset preferences
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset preferences?</DialogTitle>
            <DialogDescription>
              Restores every setting on this page to its default. Your Library, watch history,
              ratings, and notes are never affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={reset} loading={isPending}>
              Reset preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
