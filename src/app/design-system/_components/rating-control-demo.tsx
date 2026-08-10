"use client";

import { useState } from "react";
import { RatingControl } from "@/components/ui/rating-control";

const LABELS = ["Bad", "Weak", "Good", "Great", "Excellent"];

// A local-state demo wrapper — RatingControl itself is fully controlled
// (no internal state), so the design-system showcase needs a tiny client
// boundary to hold a value for it to reflect. Real callers
// (`features/media/media-rating.tsx`) own their own state instead.
export function RatingControlDemo({ initial }: { initial: number | null }) {
  const [value, setValue] = useState(initial);
  return (
    <RatingControl
      value={value}
      onValueChange={setValue}
      labels={LABELS}
      aria-label="Demo rating"
    />
  );
}
