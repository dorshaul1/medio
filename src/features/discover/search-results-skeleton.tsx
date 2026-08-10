import { Skeleton } from "@/components/ui/skeleton";

export function SearchResultsSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 6 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered
        <div key={index} className="flex items-center gap-3 p-2">
          <Skeleton className="aspect-2/3 w-12 shrink-0 rounded-sm sm:w-14" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2 rounded-sm" />
            <Skeleton className="h-3 w-10 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
