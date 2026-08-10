"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SeasonSummary } from "@/server/media/types";

// Direct season jump — the one piece of the season switcher that
// genuinely needs client JS (Select's open/close/keyboard behavior).
// A compact dropdown scales to a long-running show's season count far
// better than rendering every season as a tab; still fully keyboard
// operable via the underlying Select primitive.
export function SeasonSelect({
  showId,
  sortedSeasons,
  currentSeasonNumber,
}: {
  showId: number;
  sortedSeasons: readonly SeasonSummary[];
  currentSeasonNumber: number;
}) {
  const router = useRouter();

  return (
    <Select
      value={String(currentSeasonNumber)}
      onValueChange={(value) => router.push(`/shows/${showId}/seasons/${value}` as Route)}
    >
      <SelectTrigger aria-label="Jump to season" className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sortedSeasons.map((season) => (
          <SelectItem key={season.id} value={String(season.seasonNumber)}>
            {season.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
