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
import type { ImportBatchSummary } from "@/server/import/batches";
import { undoImportBatchAction } from "./data-actions";

const SOURCE_LABEL: Record<string, string> = {
  medio: "MEDIO",
  letterboxd: "Letterboxd",
  csv: "CSV",
};

const BATCH_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function totalRecords(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

// Settings → Data's lightweight audit trail — see docs/data-portability.md,
// "Import history". Never a giant table: source, date, count, and an
// "Undo" that only ever appears while it's actually safe to offer (a
// batch already undone shows that plainly, never a dead second button).
export function DataImportHistory({
  initialBatches,
}: {
  initialBatches: readonly ImportBatchSummary[];
}) {
  const [batches, setBatches] = useState(initialBatches);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmUndo() {
    const batchId = undoingId;
    if (!batchId) return;
    startTransition(async () => {
      await undoImportBatchAction(batchId);
      setBatches((previous) =>
        previous.map((batch) =>
          batch.id === batchId ? { ...batch, status: "rolled_back" } : batch,
        ),
      );
      setUndoingId(null);
    });
  }

  const undoingBatch = batches.find((batch) => batch.id === undoingId) ?? null;

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {batches.map((batch) => (
          <li key={batch.id} className="flex items-center justify-between gap-4 py-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">
                {SOURCE_LABEL[batch.source] ?? batch.source}
              </p>
              <p className="text-xs text-muted-foreground">
                {BATCH_DATE_FORMATTER.format(batch.importedAt)} ·{" "}
                {totalRecords(batch.counts).toLocaleString()} records
                {batch.status === "rolled_back" ? " · Undone" : ""}
              </p>
            </div>
            {batch.status === "completed" ? (
              <Button variant="outline" size="sm" onClick={() => setUndoingId(batch.id)}>
                Undo
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <Dialog open={undoingBatch !== null} onOpenChange={(open) => !open && setUndoingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Undo this{" "}
              {undoingBatch ? (SOURCE_LABEL[undoingBatch.source] ?? undoingBatch.source) : ""}{" "}
              import?
            </DialogTitle>
            <DialogDescription>
              Removes exactly what this import created. Anything you've changed since — a comment
              you edited, a title you moved to Backlog — is kept, never touched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoingId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" loading={isPending} onClick={confirmUndo}>
              Undo import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
