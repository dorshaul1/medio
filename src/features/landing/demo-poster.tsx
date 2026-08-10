import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  peach: "bg-pastel-peach",
  blue: "bg-pastel-blue",
  sage: "bg-pastel-sage",
  lavender: "bg-pastel-lavender",
  rose: "bg-pastel-rose",
} as const;

// The one "artwork" primitive every Landing illustration reuses — a
// solid pastel-accent chip with the same movie/show iconography
// `MediaPosterFallback` already uses elsewhere in the product, standing
// in for a poster without needing real provider artwork (see CLAUDE.md,
// "Demo Content"/"Media Imagery"). Deliberately three sizes only, not a
// numeric prop, so every illustration reads at a consistent scale.
export function DemoPoster({
  tone,
  icon: Icon,
  size = "md",
  className,
}: {
  tone: keyof typeof TONE_CLASS;
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = { sm: "size-8", md: "size-11", lg: "size-16" }[size];
  const iconSizeClass = { sm: "size-3.5", md: "size-5", lg: "size-7" }[size];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md",
        sizeClass,
        TONE_CLASS[tone],
        className,
      )}
    >
      <Icon strokeWidth={1.5} className={cn(iconSizeClass, "text-foreground/70")} />
    </div>
  );
}
