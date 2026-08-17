import { AppShell } from "@/components/shell/app-shell";
import { requireSession } from "@/server/auth/session";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

// UX-level route protection for the four primary destinations — not the
// data-security boundary. Any server code that reads/writes user-owned
// data must still validate its own session; see docs/authentication.md.
// `getCurrentUserPreferences` is memoized per request (`React.cache`), so
// this doesn't cost a second DB round trip beyond the one the root
// layout already made for Theme (see docs/settings.md).
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireSession();
  const preferences = await getCurrentUserPreferences();

  return (
    <AppShell
      user={{ name: user.name, email: user.email, image: user.image ?? null }}
      density={preferences.density}
      motion={preferences.motion}
    >
      {children}
    </AppShell>
  );
}
