import { Instrument_Serif } from "next/font/google";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

// The MEDIO brand mark — deliberately not the application's own UI
// typeface (Geist Sans, see app/layout.tsx). Instrument Serif is a
// display serif built specifically to read well at large sizes with
// clean, confident letterforms — editorial and premium without the
// ornamental flourish of a script/luxury-fashion serif, and without the
// generic-SaaS or futuristic-gaming connotations a geometric sans or
// tech-display face would carry. Regular weight only (the face has no
// bold cut) — at this size and tracking, the weight itself reads as
// intentional restraint, not an oversight.
const wordmarkFont = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// Typography-only — no icon, no badge, no container. `uppercase` is a
// display transform on top of the already-uppercase `siteConfig.name`,
// so the mark still reads correctly should that value ever change.
// Tracking is deliberately restrained (not the wide-spaced-out treatment
// generic SaaS logos default to) — a serif this refined earns its
// presence from the letterforms and size, not from spacing them apart.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        wordmarkFont.className,
        "block text-[1.75rem] leading-none font-normal tracking-[0.02em] text-primary uppercase select-none",
        className,
      )}
    >
      {siteConfig.name}
    </span>
  );
}
