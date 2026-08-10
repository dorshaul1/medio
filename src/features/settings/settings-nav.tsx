import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  SETTINGS_CATEGORY_LABEL,
  type SettingsCategory,
  visibleSettingsCategories,
} from "./settings-params";

// A compact category rail — typography, spacing, and a quiet active
// fill, never a boxed enterprise-admin sidebar or a giant tab bar (see
// docs/settings.md, "Internal navigation"). One responsive markup rather
// than separate desktop/mobile components: a horizontal scroll row below
// `md`, a vertical rail at `md` and above — the category list itself
// never changes, only its orientation.
export function SettingsNav({ active }: { active: SettingsCategory }) {
  return (
    <nav
      aria-label="Settings categories"
      className="scrollbar-media -mx-5 flex gap-1 overflow-x-auto px-5 sm:-mx-8 sm:px-8 md:mx-0 md:w-48 md:shrink-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0"
    >
      {visibleSettingsCategories().map((category) => (
        <Link
          key={category}
          href={`/settings/${category}`}
          aria-current={category === active ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap outline-none transition-colors",
            "focus-visible:ring-3 focus-visible:ring-ring/50",
            category === active
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {SETTINGS_CATEGORY_LABEL[category]}
        </Link>
      ))}
    </nav>
  );
}
