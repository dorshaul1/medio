"use client";

import { useEffect } from "react";
import { PageContainer } from "@/components/shell/page-container";
import { Button } from "@/components/ui/button";

// See the equivalent comment in src/app/(app)/movies/[id]/error.tsx.
export default function ShowDetailsError({
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
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this show right now.</p>
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      </div>
    </PageContainer>
  );
}
