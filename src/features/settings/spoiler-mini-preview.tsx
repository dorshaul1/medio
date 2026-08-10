import { cn } from "@/lib/utils";

// A miniature unwatched-episode row illustrating what each protection
// level actually hides — see docs/settings.md, "Spoiler protection".
// "Off" shows a normal still/title/overview; "Standard" keeps the still
// and title but replaces the overview with a plain hidden bar; "Strict"
// additionally replaces the still with a neutral fill and the title with
// a generic bar, matching the real applied policy in
// `src/server/spoilers/policy.ts` exactly — this preview and the real
// behavior must never drift apart.
export function SpoilerMiniPreview({ variant }: { variant: "off" | "standard" | "strict" }) {
  const hideOverview = variant !== "off";
  const hideIdentity = variant === "strict";

  return (
    <div className="flex h-12 w-16 items-center gap-1.5 bg-surface p-1.5">
      <div
        className={cn(
          "h-full w-5 shrink-0 rounded-xs",
          hideIdentity ? "bg-muted" : "bg-foreground/30",
        )}
      />
      <div className="flex flex-1 flex-col gap-1">
        <div
          className={cn(
            "h-1 rounded-full",
            hideIdentity ? "w-6 bg-muted-foreground/40" : "w-full bg-foreground/70",
          )}
        />
        <div
          className={cn(
            "h-1 rounded-full",
            hideOverview ? "w-4 bg-muted" : "w-4/5 bg-foreground/40",
          )}
        />
      </div>
    </div>
  );
}
