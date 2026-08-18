import { Inter, Inter_Tight } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { PwaManager } from "@/components/pwa-manager";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/config/site";
import { InstallProvider } from "@/features/install/install-provider";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import "./globals.css";

// MEDIO's two-typeface system — see docs/design-system.md, "Typography".
// Inter is the UI/body face (navigation, buttons, form fields, body
// copy); Inter Tight is the condensed cut used only for editorial/
// cinematic display headlines (Hero, Movie/Show titles, section leads),
// never for body copy or UI labels. Both are the reference's own
// recommended, production-safe substitutes — never a proprietary font
// file copied from the reference itself.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["500", "600", "700"],
  display: "swap",
});

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
    { media: "(prefers-color-scheme: light)", color: "#fbfaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
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
    <html lang="en" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
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
