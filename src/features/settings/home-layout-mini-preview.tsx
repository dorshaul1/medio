// Three genuinely distinct miniature Home layouts — not three flex-ratio
// variations of the same two rectangles — so each option communicates its
// actual composition before the label is even read (see docs/settings.md,
// "Home layout"). Each preview's own shape mirrors what that layout
// really renders below Up Next (see `server/home/layout.ts`, and note Up
// Next itself is a separate preference — never depicted here, so this
// preview never implies it controls Up Next too): Balanced keeps tiles +
// a thin calendar hint + light discovery; Personal fills almost the whole
// preview with personal tiles and drops discovery to a bare hint;
// Calendar abandons tiles entirely for a small dated agenda, the one
// layout that isn't tile-shaped at all.
function HeroBlock({ opacity = "60" }: { opacity?: "60" | "70" }) {
  return <div className={`h-3 shrink-0 rounded-xs bg-foreground/${opacity}`} />;
}

function BalancedPreview() {
  return (
    <div className="flex h-12 w-16 flex-col gap-1 bg-surface p-1.5">
      <HeroBlock />
      <div className="flex flex-1 gap-1">
        <div className="flex-1 rounded-xs bg-foreground/35" />
        <div className="flex-1 rounded-xs bg-foreground/35" />
      </div>
      {/* A thin calendar-teaser line — Balanced's "restrained amount of
          discovery", never a full agenda. */}
      <div className="h-1 w-3/4 rounded-full bg-primary/50" />
      {/* One quiet discovery tile — present, but clearly secondary. */}
      <div className="h-2 w-1/3 rounded-xs bg-foreground/15" />
    </div>
  );
}

function PersonalPreview() {
  return (
    <div className="flex h-12 w-16 flex-col gap-1 bg-surface p-1.5">
      <div className="flex flex-col gap-0.5">
        <HeroBlock opacity="70" />
        {/* Progress strip under the hero — Personal is the layout where
            progress context gets the most visual room. */}
        <div className="h-1 w-2/3 rounded-full bg-primary/60" />
      </div>
      {/* Continue Watching + Backlog tiles filling nearly all the
          remaining space — no calendar row, only a bare discovery hint. */}
      <div className="flex flex-1 gap-1">
        <div className="flex-1 rounded-xs bg-foreground/45" />
        <div className="flex-1 rounded-xs bg-foreground/45" />
        <div className="flex-1 rounded-xs bg-foreground/45" />
      </div>
      <div className="h-1 w-1/5 rounded-xs bg-foreground/10" />
    </div>
  );
}

// A small "date chip" — a filled square, not a dot — is what makes this
// preview read as calendar/agenda rows rather than just a generic list
// (see docs/settings.md, "Home layout" — the previous dot-based version
// read too close to a plain bullet list).
function DateChip({ opacity }: { opacity: "70" | "25" | "15" }) {
  return <div className={`size-2.5 shrink-0 rounded-[3px] bg-primary/${opacity}`} />;
}

function CalendarPreview() {
  return (
    <div className="flex h-12 w-16 flex-col justify-center gap-1.5 bg-surface p-1.5">
      {/* A small dated agenda, not tiles — the one layout that reads as a
          timeline, deliberately unlike Balanced/Personal's grids. */}
      <div className="flex items-center gap-1">
        <DateChip opacity="70" />
        <div className="h-1 flex-1 rounded-full bg-foreground/70" />
      </div>
      <div className="flex items-center gap-1">
        <DateChip opacity="25" />
        <div className="h-1 w-4/5 rounded-full bg-foreground/45" />
      </div>
      <div className="flex items-center gap-1">
        <DateChip opacity="15" />
        <div className="h-1 w-3/5 rounded-full bg-foreground/25" />
      </div>
    </div>
  );
}

export function HomeLayoutMiniPreview({
  variant,
}: {
  variant: "balanced" | "personal" | "calendar";
}) {
  if (variant === "personal") return <PersonalPreview />;
  if (variant === "calendar") return <CalendarPreview />;
  return <BalancedPreview />;
}
