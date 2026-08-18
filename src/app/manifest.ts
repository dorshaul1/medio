import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Next's file-convention manifest route (`app/manifest.ts`) — the
// framework generates `/manifest.webmanifest` and injects the
// `<link rel="manifest">` tag automatically; no static JSON file to keep
// in sync by hand. See docs/pwa.md, "Manifest ownership".
//
// `start_url`/`scope` are `/` — MEDIO's own root already branches
// server-side between the public Landing page and the authenticated Home
// experience by session state (see docs/authentication.md, "`/` behavior
// by auth state"); installed MEDIO launches into exactly that same
// decision, never a separate PWA-only start page or duplicated auth
// logic.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: "Track exactly what you've watched, episode by episode.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The manifest spec allows only one static pair (no light/dark
    // variants the way `<meta name="theme-color" media="...">` in
    // `app/layout.tsx`'s `viewport` export supports) — set to the dark
    // canvas/Clay pair since Dark is MEDIO's primary, most faithful
    // expression of the current visual system (see docs/design-system.md,
    // "Visual language"). Keep in sync with globals.css's dark
    // `--background` and `medio-mark.tsx`'s `CLAY` by hand — both are
    // fixed values for the same reason this is (see medio-mark.tsx).
    background_color: "#141312",
    theme_color: "#c1502e",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
