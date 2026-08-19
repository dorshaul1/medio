import { Skeleton } from "@/components/ui/skeleton";

// Matches `UpNextCard`'s own real box model exactly — same border/
// radius/padding, and every bar's height is the real `<p>`/`<h2>` it
// stands in for's own Tailwind line-height (text-xs → `h-4`, text-sm →
// `h-5`, text-xl/2xl → `h-7`/`h-8`), not a rounder decorative number —
// a skeleton whose bars are shorter than the text that replaces them is
// exactly what causes a visible "hump" the moment real content arrives.
// Flat and calm rather than trying to preview the eventual photo
// backdrop: a plain bordered box with muted bars, the same restrained
// language every other skeleton in the app already uses.
export function UpNextCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-5 sm:p-6">
      <Skeleton className="h-4 w-16 rounded-sm" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-2/3 rounded-sm sm:h-8" />
        <Skeleton className="h-5 w-1/2 rounded-sm" />
        <Skeleton className="h-4 w-1/3 rounded-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}
