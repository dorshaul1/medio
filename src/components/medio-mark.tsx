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

// `inset` is the fraction of the tile reserved as empty margin — 0 for a
// standard/"any"-purpose icon (the platform already respects the full
// square), ~0.1 for a maskable icon, whose *outer* ~20% can be cropped
// away by an arbitrary OS mask shape (circle, squircle, rounded square),
// so real content must stay inside that safe inner zone.
export function MedioMark({ size, inset = 0 }: { size: number; inset?: number }) {
  const margin = size * inset;
  const content = size - margin * 2;
  const barWidth = content * 0.16;
  const gap = content * 0.12;
  const heights = [0.42, 0.68, 0.9].map((fraction) => content * fraction);

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
          width: content,
          height: content,
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
