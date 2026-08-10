// A miniature row-list illustrating Comfortable vs Compact — see
// docs/settings.md, "Content density". Uses real semantic tokens (unlike
// ThemeMiniPreview): density doesn't depict an absolute appearance, so it
// should still read correctly in whichever theme the settings page is
// currently in.
export function DensityMiniPreview({ variant }: { variant: "comfortable" | "compact" }) {
  const rows = variant === "comfortable" ? 2 : 3;
  const rowHeight = variant === "comfortable" ? "h-3.5" : "h-2.5";
  const gap = variant === "comfortable" ? "gap-1.5" : "gap-0.5";

  return (
    <div className="flex h-12 w-16 flex-col justify-center gap-1.5 bg-surface p-1.5">
      <div className={`flex flex-col ${gap}`}>
        {Array.from({ length: rows }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-count decorative preview, never reordered.
          <div key={index} className="flex items-center gap-1">
            <div className={`w-2.5 shrink-0 rounded-xs bg-foreground/40 ${rowHeight}`} />
            <div
              className={`flex-1 rounded-full bg-foreground/70 ${variant === "comfortable" ? "h-1" : "h-0.5"}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
