import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_GRADIENT = {
  blue: "from-pastel-blue/90 via-pastel-blue/40 to-surface-subtle",
  peach: "from-pastel-peach/90 via-pastel-peach/40 to-surface-subtle",
  sage: "from-pastel-sage/90 via-pastel-sage/40 to-surface-subtle",
  lavender: "from-pastel-lavender/90 via-pastel-lavender/40 to-surface-subtle",
} as const;

// A large "poster/backdrop" panel — the one deliberate exception to
// "pastel tokens are sparing fills, never large backgrounds" (see
// CLAUDE.md, "Visual system"): this stands in for real media artwork on
// the public Landing page specifically, which is meant to carry color
// the same way a real poster would (see CLAUDE.md, "Landing" —
// "media artwork supplies most of the page's color"). Never used inside
// the authenticated product, where a real poster does that job instead.
export function DemoArtwork({
  tone,
  icon: Icon,
  className,
  children,
}: {
  tone: keyof typeof TONE_GRADIENT;
  icon: LucideIcon;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br",
        TONE_GRADIENT[tone],
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1}
        className="absolute -right-4 -bottom-4 size-28 text-foreground/10"
      />
      {children}
    </div>
  );
}
