import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";

// Deliberately not the centered-card template: on sm+ screens the form
// sits left, anchored in generous negative space rather than dead center.
// Mobile has no room for that asymmetry, so it centers instead.
export function AuthScreen({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 sm:justify-start sm:px-16 lg:px-24">
      <div className="w-full max-w-sm">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {siteConfig.name}
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">{title}</h1>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
      </div>
    </main>
  );
}
