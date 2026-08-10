import { Wordmark } from "@/components/shell/wordmark";

// Intentionally tiny — see CLAUDE.md, "Public Footer". No link columns,
// no legal boilerplate for pages that don't exist.
export function LandingFooter() {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-border px-6 py-8 sm:px-10">
      <Wordmark className="text-base" />
      <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} MEDIO</p>
    </footer>
  );
}
