// A minimal illustration of what "Full" vs "Reduced" motion means — see
// docs/settings.md, "Interface motion". "Full" shows a dot genuinely
// travelling between two positions (`motion-safe:` only — this preview
// itself must never animate for a visitor whose OS already requests
// reduced motion); "Reduced"/"System" show the same two states with no
// travel, just a plain static arrow.
export function MotionMiniPreview({ variant }: { variant: "system" | "full" | "reduced" }) {
  return (
    <div className="flex h-12 w-16 items-center justify-center gap-2 bg-surface">
      <span className="size-2 rounded-full bg-foreground/70" />
      <span aria-hidden="true" className="text-muted-foreground">
        →
      </span>
      <span
        className={
          variant === "full"
            ? "size-2 rounded-full bg-foreground/70 motion-safe:animate-[bounce_1.6s_ease-in-out_infinite]"
            : "size-2 rounded-full bg-foreground/70"
        }
      />
    </div>
  );
}
