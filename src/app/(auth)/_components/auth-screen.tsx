import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/shell/wordmark";

// Deliberately not the centered-card template: on sm+ screens the form
// sits left, anchored in generous negative space rather than dead
// center. Mobile has no room for that asymmetry, so it centers instead.
// The real MEDIO wordmark (not plain text) plus one contextual line of
// copy give this a real brand presence — a focused extension of the
// Landing page, not an anonymous form — while the form itself stays the
// visually dominant element (see CLAUDE.md, "Sign In / Sign Up").
export function AuthScreen({
  title,
  tagline,
  children,
  footer,
}: {
  title: string;
  tagline: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 sm:justify-start sm:px-16 lg:px-24">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block">
          <Wordmark className="text-xl" />
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
        <h1 className="mt-8 text-2xl font-medium tracking-tight">{title}</h1>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
      </div>
    </main>
  );
}
