"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// The only client boundary theming needs: next-themes injects a
// pre-hydration script that sets the `dark` class before paint, so there's
// no flash and no need to make anything above this a Client Component.
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
