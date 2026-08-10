"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { MockDataResult } from "@/server/dev-tools/mock-data";
import { seedMockDataAction } from "./dev-tools-actions";

// Not optimistic, on purpose — this creates real rows, and the exact
// counts (and any show that couldn't be fetched from TMDB) are worth
// reporting back precisely rather than guessing.
export function SeedMockDataControl() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<MockDataResult | null>(null);
  const [failed, setFailed] = useState(false);

  function seed() {
    startTransition(async () => {
      try {
        const next = await seedMockDataAction();
        setResult(next);
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" onClick={seed} loading={isPending}>
        Add mock data
      </Button>
      {result ? (
        <p className="max-w-sm text-xs text-muted-foreground">
          Added {result.movieEventsCreated} movie plays, {result.episodeEventsCreated} episode plays
          across {result.showsSeeded} shows, and {result.planningItemsCreated} planning items.
          {result.showsFailed.length > 0
            ? ` ${result.showsFailed.length} show(s) couldn't be fetched from TMDB.`
            : ""}
        </p>
      ) : null}
      {failed ? (
        <p className="text-xs text-destructive">Something went wrong adding mock data.</p>
      ) : null}
    </div>
  );
}
