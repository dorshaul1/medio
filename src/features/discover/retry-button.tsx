"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// The correct App Router "retry" primitive for a failed Server Component
// render: re-render the current route's server tree without a full page
// reload or changing the URL. Its own tiny client boundary — nothing else
// on the page needs to be a Client Component for this.
export function RetryButton() {
  const router = useRouter();

  return (
    <Button variant="outline" size="sm" onClick={() => router.refresh()}>
      Try again
    </Button>
  );
}
