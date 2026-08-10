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
import { DISCOVER_SORT_OPTIONS } from "@/features/discover/discover-params";
import type { DiscoverSort } from "@/server/tmdb/queries";

// The one genuinely interactive piece of a genre page — everything else
// (results, pagination) is plain server-rendered content.
export function GenreSortSelect({ basePath, sort }: { basePath: string; sort: DiscoverSort }) {
  const router = useRouter();

  function handleChange(value: string) {
    // Changing sort starts back at page 1 — a page number from the old
    // sort order doesn't mean anything under the new one.
    router.push(`${basePath}?sort=${value}` as Route);
  }

  return (
    <Select value={sort} onValueChange={handleChange}>
      <SelectTrigger aria-label="Sort by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DISCOVER_SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
