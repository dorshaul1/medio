"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// A real browser-history back, not a fixed destination link — a genre's
// "View all" page is reached from several different places (Discover,
// Search, Home, another title's related row, a genre row), so there's no
// single "parent" route a static Link could point to.
//
// Deliberately not built on the `Button` primitive — this is a quiet
// navigational affordance, not a call-to-action, so it never carries
// Button's background/hover-fill treatment.
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <ChevronLeft aria-hidden="true" strokeWidth={2.25} className="size-4" />
      Back
    </button>
  );
}
