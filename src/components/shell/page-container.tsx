import type { ReactNode } from "react";

// The single default for page content width/gutters — future pages should
// use this rather than inventing their own padding/max-width per page.
export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</div>
  );
}
