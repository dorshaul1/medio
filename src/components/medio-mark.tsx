// The shared MEDIO app-icon mark — three ascending rounded bars (echoing
// Stats' own "Viewing rhythm" chart and the product's core promise of
// exact, sequential episode tracking), never a literal "MEDIO" wordmark
// squeezed into a square, a generic play triangle, or a clapperboard
// cliché — see docs/pwa.md, "App icon design". Deliberately simple
// geometry: it has to read clearly at a 29px iOS Home Screen size, not
// just at 512px. Lives here (not under `app/icons/`) because it's used
// two ways: rendered through `next/og`'s `ImageResponse` for the actual
// icon routes (`app/icon.tsx`, `app/apple-icon.tsx`, `app/icons/*/
// route.tsx`), and rendered as normal React for Landing's own "install
// MEDIO" illustration (`features/landing/illustrations/
// mobile-install-illustration.tsx`) — the same real mark in both places,
// never a second approximation.
//
// Colors are plain hex approximations of the real `--primary` (clay) /
// `--primary-foreground` tokens (see globals.css), deliberately not the
// live CSS custom properties: `next/og`'s Satori renderer (which the
// icon routes use) can't read them, and an app-icon's brand colors
// should stay fixed regardless of the viewer's light/dark theme anyway
// — the same reasoning a real installed Home Screen icon never changes
// color with the OS theme.
const CLAY = "#8b5e45";
const CLAY_FOREGROUND = "#f5efe9";

// A generous, deliberate safe margin every icon keeps, standard or not —
// most platforms already add their own shadow/highlight treatment right
// at a tile's edge, so content that fills the full square reads as
// cramped next to icons that already keep real breathing room (compare
// any modern iOS/Android app icon). `inset` adds *additional* margin on
// top of this base for a maskable icon specifically, whose outer ~20%
// may be cropped away by an arbitrary OS mask shape (circle, squircle,
// rounded square).
const BASE_PADDING = 0.16;

export function MedioMark({ size, inset = 0 }: { size: number; inset?: number }) {
  const margin = size * (BASE_PADDING + inset);
  const contentWidth = size - margin * 2;
  const barWidth = contentWidth * 0.18;
  const gap = contentWidth * 0.16;
  // The bar group's own height is deliberately less than the full
  // padded content box — centered top-to-bottom by the outer flex
  // container below, rather than bottom-anchored flush against the
  // padding, so the mark reads as one centered composition sitting in
  // the middle of the tile, not a chart glued to its bottom edge.
  const barGroupHeight = contentWidth * 0.82;
  const heights = [0.45, 0.72, 1].map((fraction) => barGroupHeight * fraction);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: CLAY,
        // A maskable icon's background must fill the entire tile (the OS
        // applies its own mask shape on top) — no rounded corners of our
        // own there, since the platform's own crop already provides one.
        // A standard icon gets a gentle rounded-square, matching the
        // product's own `--radius` proportionally.
        borderRadius: inset > 0 ? 0 : size * 0.22,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap,
          width: contentWidth,
          height: barGroupHeight,
        }}
      >
        {heights.map((height) => (
          <div
            key={height}
            style={{
              width: barWidth,
              height,
              background: CLAY_FOREGROUND,
              borderRadius: barWidth * 0.4,
            }}
          />
        ))}
      </div>
    </div>
  );
}
