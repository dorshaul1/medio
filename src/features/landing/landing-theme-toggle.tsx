"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";

// A logged-out visitor has no `user_preferences` row to persist a Theme
// choice to (see docs/settings.md, "Theme architecture") — this only
// ever calls next-themes' own `setTheme`, the same local, flicker-free
// mechanism that already paints this browser instantly before hydration.
// Icon-first, matching CLAUDE.md's "Landing Theme Control" guidance —
// not the full `VisualChoice` preview picker Settings uses, which would
// be far too heavy for a quiet corner of public navigation.
export function LandingThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // `resolvedTheme` is undefined until next-themes hydrates client-side
  // — rendering a fixed icon until then avoids ever guessing wrong.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <IconButton
      variant="ghost"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </IconButton>
  );
}
