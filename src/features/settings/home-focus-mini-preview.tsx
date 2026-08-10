// A miniature Home composition illustrating which section gets more
// room — see docs/settings.md, "Home focus". The top block stands in for
// personal sections (Up Next/Continue Watching); the bottom for public
// discovery (Trending/Popular).
export function HomeFocusMiniPreview({
  variant,
}: {
  variant: "balanced" | "personal" | "discovery";
}) {
  const personalFlex = variant === "personal" ? 3 : variant === "discovery" ? 1 : 2;
  const publicFlex = variant === "discovery" ? 3 : variant === "personal" ? 1 : 2;

  return (
    <div className="flex h-12 w-16 flex-col gap-1 bg-surface p-1.5">
      <div className="rounded-xs bg-foreground/50" style={{ flexGrow: personalFlex }} />
      <div className="rounded-xs bg-foreground/20" style={{ flexGrow: publicFlex }} />
    </div>
  );
}
