import {
  Bookmark,
  Code2,
  Database,
  EyeOff,
  House,
  LayoutTemplate,
  type LucideIcon,
  Palette,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  SETTINGS_CATEGORY_LABEL,
  type SettingsCategory,
  visibleSettingsCategories,
} from "./settings-params";

// One small, recognizable glyph per category — never a decorative
// flourish, just a faster visual anchor for scanning the list (see
// docs/settings.md, "Internal navigation"). Kept here rather than in
// settings-params.ts, which stays framework-agnostic plain data.
const SETTINGS_CATEGORY_ICON: Record<SettingsCategory, LucideIcon> = {
  general: Settings2,
  appearance: Palette,
  tracking: Bookmark,
  spoilers: EyeOff,
  home: House,
  defaults: LayoutTemplate,
  data: Database,
  developer: Code2,
};

// Two genuinely different compositions for the same category list, not
// a shrunk desktop rail on mobile. At `md` and above: a compact vertical
// rail beside the active category's content, a quiet active fill, never
// a boxed enterprise-admin sidebar. Below `md`: a plain full-width list
// of rows (divided, a leading icon, each one real Link) — never a
// horizontal scrolling tab strip or a trailing chevron competing for
// attention; this is a menu of settings areas to open one at a time,
// each opening its own page (`/settings/[category]/layout.tsx` hides
// this list on mobile once a category is open, showing a back link
// instead — see docs/settings.md).
export function SettingsNav({ active }: { active: SettingsCategory }) {
  return (
    <nav aria-label="Settings categories" className="md:w-48 md:shrink-0">
      <ul className="flex flex-col divide-y divide-border md:hidden">
        {visibleSettingsCategories().map((category) => {
          const Icon = SETTINGS_CATEGORY_ICON[category];
          return (
            <li key={category}>
              <Link
                href={`/settings/${category}`}
                aria-current={category === active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 py-3.5 text-sm font-medium outline-none transition-colors",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  category === active ? "text-foreground" : "text-foreground hover:text-primary",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                {SETTINGS_CATEGORY_LABEL[category]}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden flex-col gap-0.5 md:flex">
        {visibleSettingsCategories().map((category) => {
          const Icon = SETTINGS_CATEGORY_ICON[category];
          return (
            <Link
              key={category}
              href={`/settings/${category}`}
              aria-current={category === active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap outline-none transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/50",
                category === active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {SETTINGS_CATEGORY_LABEL[category]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
