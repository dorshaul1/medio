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
    // The product's real neutral surfaces (see globals.css) — a warm
    // off-white light background, warm charcoal dark background. Chosen
    // to match `theme-color` (see `app/layout.tsx`'s `viewport` export)
    // so the OS/browser chrome around an installed launch reads as one
    // continuous surface, never a mismatched flash of white/black.
    background_color: "#faf6f0",
    theme_color: "#8b5e45",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
