"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// A clamp-with-toggle, not a generic accordion (see docs/media-provider.md,
// "Biography") — collapsed to a readable few lines by default, expandable
// in place. "Read more" only appears when the biography actually overflows
// the clamp (measured via `scrollHeight`, not a character-count guess —
// font size/viewport width both affect how much text six lines actually
// holds), so a short bio never shows a toggle that would visibly do
// nothing. Renders nothing at all when there's no biography — no
// "Biography unavailable" placeholder taking up a section (see the same
// doc, "Missing biography").
export function PersonBiography({ biography }: { biography: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    setOverflowing(element.scrollHeight > element.clientHeight + 1);
  }, []);

  if (!biography) return null;

  return (
    <section aria-labelledby="person-biography" className="flex flex-col gap-3 sm:max-w-2xl">
      <h2 id="person-biography" className="text-lg font-medium tracking-tight">
        Biography
      </h2>
      <p
        ref={textRef}
        className={cn(
          "text-sm leading-relaxed whitespace-pre-line text-foreground/90",
          !expanded && "line-clamp-6",
        )}
      >
        {biography}
      </p>
      {overflowing && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start rounded-sm text-sm font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-2 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          Read more
        </button>
      ) : null}
    </section>
  );
}
