"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";

// A Client Component by Next's own convention (error boundaries can't be
// Server Components). Distinct from not-found: this is "something went
// wrong fetching this movie" (a TmdbError that wasn't `not_found` —
// unavailable/rate_limited/unknown — or an unexpected exception), not
// "this movie doesn't exist".
export default function MovieDetailsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageContainer>
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this movie right now.</p>
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      </div>
    </PageContainer>
  );
}
