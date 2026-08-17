import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { siteConfig } from "@/config/site";
import { HomePage } from "@/features/home/home-page";
import { LandingPage } from "@/features/landing/landing-page";
import { getCurrentSession } from "@/server/auth/session";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

// `/` branches on session state — never a redirect either way, so
// neither a logged-out visitor nor a returning one ever sees a flash of
// the wrong experience (see docs/authentication.md, "`/` behavior by
// auth state"). This is why Home no longer lives inside the `(app)`
// route group: that group's layout unconditionally requires a session
// for everything in it, which is exactly the "immediately redirect to
// sign-in" behavior a logged-out visitor to `/` must never get.
export async function generateMetadata(): Promise<Metadata> {
  const session = await getCurrentSession();
  if (session) {
    return { title: "Home" };
  }

  const description =
    "Track every movie and show you watch, pick up where you left off, and let MEDIO help you decide what to watch next.";

  return {
    title: { absolute: siteConfig.name },
    description,
    // A logged-out visitor landing here from a shared link is the one
    // audience this metadata is actually for — see CLAUDE.md, "SEO /
    // Metadata". Authenticated Home (the `{ title: "Home" }` branch
    // above) never needs Open Graph data; nothing there is public.
    openGraph: {
      title: siteConfig.name,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: siteConfig.name,
      description,
    },
  };
}

export default async function RootPage() {
  const session = await getCurrentSession();

  if (!session) {
    return <LandingPage />;
  }

  const preferences = await getCurrentUserPreferences();

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
      density={preferences.density}
      motion={preferences.motion}
    >
      <HomePage />
    </AppShell>
  );
}
