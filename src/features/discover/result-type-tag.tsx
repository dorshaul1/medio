import { Film, Tv, User } from "lucide-react";

// The one subtle signal that tells Movies/Shows/People apart in a
// unified result list — an icon + a plain word, MEDIO's existing neutral
// icon language, never a colored badge (see docs/media-provider.md,
// "Unified search ranking": type is communicated, not ranked).
const CONFIG = {
  movie: { Icon: Film, label: "Movie" },
  show: { Icon: Tv, label: "Show" },
  person: { Icon: User, label: "Person" },
} as const;

export function ResultTypeTag({ kind }: { kind: "movie" | "show" | "person" }) {
  const { Icon, label } = CONFIG[kind];
  return (
    <span className="inline-flex items-center gap-1">
      <Icon aria-hidden="true" strokeWidth={1.75} className="size-3" />
      {label}
    </span>
  );
}
