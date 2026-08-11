import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { PwaManager } from "@/components/pwa-manager";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/config/site";
import { InstallProvider } from "@/features/install/install-provider";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: "Personal movies and TV shows tracking, in progress.",
  // `manifest`/icon `<link>` tags are already injected automatically by
  // the `app/manifest.ts`/`app/icon.tsx`/`app/apple-icon.tsx` file
  // conventions — only iOS-specific "launch as an app" metadata (no
  // equivalent file convention) needs to be listed explicitly here. See
  // docs/pwa.md, "Installability".
  appleWebApp: { capable: true, statusBarStyle: "default", title: siteConfig.name },
  // Prevents iOS from auto-linking incidental phone-number-looking text
  // (e.g. a rating count, an episode number) as a tappable `tel:` link —
  // a small, real polish item, not a PWA requirement on its own.
  formatDetection: { telephone: false },
};

// `themeColor` is an array so light/dark installed chrome (status bar,
// task switcher card, etc.) integrates with whichever real MEDIO surface
// color is active, rather than one static compromise color — see
// docs/pwa.md, "Theme integration". `maximumScale`/`userScalable` are
// deliberately left at their defaults: never disable pinch-zoom (a real
// accessibility regression some outdated PWA guides recommend).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

// The one place Theme touches the root layout — see docs/settings.md,
// "Theme architecture". `defaultTheme` only ever governs what next-themes
// falls back to before *this browser* has ever recorded its own choice
// (its own localStorage remains what actually paints instantly on every
// later visit, avoiding any flash); seeding it from the user's saved
// preference means a brand-new device starts from their real setting
// instead of always defaulting to "system". `getCurrentUserPreferences`
// returns product defaults for a signed-out visitor, so this is safe on
// `/sign-in`/`/sign-up` too.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const preferences = await getCurrentUserPreferences();

  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme={preferences.theme}
          enableSystem
          disableTransitionOnChange
        >
          {/* One shared install domain for the whole app — both the
              public Landing page and authenticated Settings read the
              same `useInstall()` state (see docs/pwa.md, "Install
              promotion policy"). */}
          <InstallProvider>
            {children}
            <PwaManager />
          </InstallProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
