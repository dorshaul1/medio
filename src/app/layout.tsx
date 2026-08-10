import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/config/site";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: "Personal movies and TV shows tracking, in progress.",
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
