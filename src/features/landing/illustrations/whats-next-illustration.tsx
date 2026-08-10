import { Clapperboard, Tv } from "lucide-react";
import {
  DEMO_MOVIE_RELEASE,
  DEMO_SHOW_CURRENT,
  DEMO_SHOW_UPCOMING,
} from "@/features/landing/demo-content";
import { DemoPoster } from "@/features/landing/demo-poster";

// "Always know what's next" — Up Next and release awareness told as one
// compact moment rather than two separate sections (see CLAUDE.md,
// "Landing" — group product ideas into outcomes, not routes). A
// deliberately smaller, quieter illustration than Tracking/Library/Pick
// for Me — this is the page's one restrained supporting beat, not
// another major moment.
export function WhatsNextIllustration() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex items-center gap-3">
        <DemoPoster tone="blue" icon={Tv} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{DEMO_SHOW_CURRENT.title}</p>
          <p className="text-sm text-primary">
            S{DEMO_SHOW_CURRENT.season} E{DEMO_SHOW_CURRENT.nextEpisode} · Up next
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <DemoPoster tone="sage" icon={Tv} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{DEMO_SHOW_UPCOMING.title}</p>
          <p className="text-xs text-muted-foreground">
            Friday · {DEMO_SHOW_UPCOMING.releaseLabel}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <DemoPoster tone="peach" icon={Clapperboard} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">{DEMO_MOVIE_RELEASE.title}</p>
          <p className="text-xs text-muted-foreground">
            Next week · {DEMO_MOVIE_RELEASE.releaseLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
