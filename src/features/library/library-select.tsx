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

// A small, generic URL-driven Select — the one piece of Library's filter
// bar that needs client JS (Select's open/close/keyboard behavior), same
// pattern as `features/shows/season-select.tsx`. Each option carries its
// own precomputed `href` (built server-side by the page, which owns the
// other active filters) — a function can't cross the Server-to-Client
// boundary as a prop, only serializable data.
export function LibrarySelect({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string; href: Route }[];
}) {
  const router = useRouter();
  const hrefByValue = new Map(options.map((option) => [option.value, option.href]));

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const href = hrefByValue.get(next);
        if (href) router.push(href);
      }}
    >
      <SelectTrigger aria-label={label} className="min-w-36 whitespace-nowrap">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
