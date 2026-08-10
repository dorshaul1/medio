import Link from "next/link";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { value: "library", label: "Library", href: "/library" },
  { value: "diary", label: "Diary", href: "/library/diary" },
] as const;

// The one restrained signal that Library and Diary are the same personal
// area serving different jobs — current state vs. chronological history
// (see docs/diary.md, "Library vs Diary"). A small breadcrumb-style
// overline above the page's own `<h1>`, not a second row of underline
// tabs: both pages already have their own content filter tabs
// (`LibraryTypeToggle`/Diary's own All·Movies·TV toggle), and stacking
// two identically-styled tab rows would read as one confusing double tab
// bar rather than two genuinely different jobs — a section switch versus
// a content filter (see CLAUDE.md, "Diary"). A plain Server Component:
// each caller already knows which section it is, so this needs no
// `usePathname()`. Stats (`/stats`) is a separate, top-level primary
// destination, not part of this switcher — see docs/stats.md.
export function LibrarySectionNav({ active }: { active: "library" | "diary" }) {
  return (
    <nav aria-label="Library section" className="flex items-center gap-1.5 text-sm">
      {SECTIONS.map((section, index) => (
        <span key={section.value} className="flex items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden="true" className="text-muted-foreground/40">
              /
            </span>
          ) : null}
          <Link
            href={section.href}
            aria-current={section.value === active ? "page" : undefined}
            className={cn(
              "rounded-sm font-medium outline-none transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              section.value === active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {section.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
