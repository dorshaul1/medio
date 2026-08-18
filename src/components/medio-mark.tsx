// The shared MEDIO app-icon mark — a watch-ring with a checkmark inside,
// the exact same shape `LibraryShowQuickAction`/`episode-watch-control.tsx`
// already draw every time a user marks something watched (see
// docs/pwa.md, "App icon design"). Never a literal "MEDIO" wordmark
// squeezed into a square, a generic play triangle, or a clapperboard
// cliché — those read as "a media app," this reads as "the specific
// thing MEDIO's own UI does." Deliberately simple geometry: it has to
// read clearly at a 29px iOS Home Screen size, not just at 512px. Lives
// here (not under `app/icons/`) because it's used two ways: rendered
// through `next/og`'s `ImageResponse` for the actual icon routes
// (`app/icon.tsx`, `app/apple-icon.tsx`, `app/icons/*/route.tsx`), and
// rendered as normal React for Landing's own "install MEDIO" illustration
// (`features/landing/illustrations/mobile-install-illustration.tsx`) —
// the same real mark in both places, never a second approximation.
//
// Colors are plain hex approximations of the real `--primary` (clay) /
// `--primary-foreground` tokens (see globals.css), deliberately not the
// live CSS custom properties: `next/og`'s Satori renderer (which the
// icon routes use) can't read them, and an app-icon's brand colors
// should stay fixed regardless of the viewer's light/dark theme anyway
// — the same reasoning a real installed Home Screen icon never changes
// color with the OS theme.
const CLAY = "#c1502e";
const CLAY_FOREGROUND = "#fbf3ee";

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
  const contentSize = size - margin * 2;
  // A true ring, not a filled disc — it has to read as "in progress /
  // trackable," the same open-stroke language the real watch-ring
  // control uses, not a solid badge. Stroke widths are proportions of
  // the 100-unit viewBox below, not the tile's own pixel size, so the
  // mark scales identically at every icon size.
  const ringStroke = 9;
  const checkStroke = 11;

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
      <svg
        aria-hidden="true"
        width={contentSize}
        height={contentSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="38" stroke={CLAY_FOREGROUND} strokeWidth={ringStroke} />
        <path
          d="M32 51 L45 64 L70 35"
          stroke={CLAY_FOREGROUND}
          strokeWidth={checkStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
