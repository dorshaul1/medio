import { cn } from "@/lib/utils";
import type { MediaPersonalState } from "@/server/media/types";

// The row-context equivalent of MediaPoster's quiet corner mark — plain
// text, not a badge, for a context with room to show a real word (a
// Search/Discover result row, unlike a dense poster grid tile). See
// docs/search.md, "Personal state on public surfaces": quietly
// visible, never a colored pill/badge stack.
const LABEL: Record<Exclude<MediaPersonalState["kind"], "none">, string> = {
  watchlist: "Watchlist",
  backlog: "Backlog",
  watched: "Watched",
  watching: "Watching",
  on_hold: "On hold",
  dropped: "Dropped",
};

export function MediaStateHint({
  state,
  className,
}: {
  state: MediaPersonalState;
  className?: string;
}) {
  if (state.kind === "none") return null;

  const label = LABEL[state.kind];

  return <span className={cn("text-xs text-muted-foreground", className)}>{label}</span>;
}
