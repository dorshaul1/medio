# Design system

## Visual language

MEDIO's visual language is adapted from a dark-stage editorial reference
(a "black-box stage lit by a warm spotlight" — see the Refero style
this phase's redesign was built from): a near-black canvas, imagery doing
the work, hairline inset borders instead of drop shadows, one saturated
signature accent used sparingly for the single most important action, and
a second, quieter editorial accent for section/category marks. This is a
deliberate **adaptation of the design language, not a copy of its
branding** — MEDIO keeps its own Clay identity (pushed to a genuinely
saturated "spotlight" version) rather than adopting the reference's own
magenta, and there is no third "conversion accent" tier (the reference's
own volt/neon layer) — that reads as marketing-site energy MEDIO's
personal-tracking product doesn't need. Dark is the primary, most
faithful expression of this language; Light is a deliberate counterpart
derived from the same relationships (canvas / raised surface / hairline
border / one accent), never an inverted afterthought — see "Themes"
below.

## Typography

Two typefaces, both `next/font/google` (never a proprietary font file
copied from a reference): **Inter** (`--font-sans`, the default) for
everything UI/body — navigation, buttons, form fields, body copy, card
titles, page-title tier headings — and **Inter Tight** (`--font-display`,
applied via the `font-display` utility) reserved for genuinely cinematic
editorial headlines only: Landing's hero, Movie/Show/Person Details'
title, and the Taste/Stats editorial headline sentence. Never body copy,
never a UI label, never a button — mixing the condensed display cut into
running text or controls is exactly the "wearing a new theme" failure
mode this phase was built to avoid. Display text pairs a large size with
tight leading (`leading-[0.9]`–`leading-[0.95]`, not the default) for the
"dramatic vertical compression" the reference calls for; UI/body text
keeps its normal, comfortable leading.

## Principles

- **Content brings the color.** Chrome stays neutral; posters, artwork, and
  media data are the only place saturated color should come from.
- **One obvious next action.** Don't visually promote several things
  equally — hierarchy should make the next step obvious.
- **Composition before containers.** Reach for typography, whitespace,
  alignment, and grouping before a card, border, or shadow.
- **Earn every visual element.** A border, surface, radius, shadow, icon,
  badge, or extra sentence needs a reason to exist, or it doesn't belong.
- **Typography before decoration.** Hierarchy comes from size, weight, and
  spacing working together — not a growing list of styles, and not
  `font-semibold` on everything that needs emphasis.
- **Restrained radii.** Small controls tighter, cards a touch looser, pills
  reserved for tags/filters/status — never the default for buttons or
  containers.
- **Neutral chrome, restrained pastel accents.** Pastels are for sparing use
  — fills, indicators, tags — never large backgrounds and never text color.
- **Clay is the signature accent, not a theme.** `primary` (a muted
  terracotta) marks primary actions, intentional selection, and focus —
  used sparingly enough that the app never reads as "a clay-colored app."
- **Dark mode is authored, not inverted.** Charcoal, not navy or
  purple-tinted "SaaS dark mode." Reviewed independently every time.
- **Mobile is designed, not compressed desktop.** Bottom navigation, safe
  areas, and touch targets are deliberate choices, not leftovers.
- **shadcn is infrastructure, not visual identity.** Radix/shadcn earn their
  place through accessibility and interaction behavior. The generated
  appearance is a starting point to redesign, never the final answer.
- **Components must have complete interaction states.** Default, hover,
  focus-visible, disabled, and whatever else applies (pressed, invalid,
  loading, checked, indeterminate, open) — not a mix of browser defaults
  and half-finished custom states.
- **Reuse before recreating.** Check `src/components/ui/` and
  `/design-system` before writing new markup that duplicates a primitive.
- **Accessibility is non-negotiable.** WCAG 2.2 AA is the floor — see
  Tokens below for how contrast is verified.

## Tokens

Semantic CSS custom properties live in `src/app/globals.css`, defined once
under `:root` (light) and `.dark` (dark), then mapped into Tailwind's theme
under `@theme inline`. Components consume the semantic Tailwind utilities
(`bg-background`, `text-muted-foreground`, `border-border`, ...) — never a
raw color value. If you find yourself reaching for an arbitrary hex or
`oklch()` value inside a component, that's a sign a token is missing; add it
to `globals.css`, not the component.

The inverse also holds: not every exact value needs a token. A component
that genuinely needs a specific size, gap, or offset can use a precise
local Tailwind value — tokens are for reusable *semantic* concepts (color,
radius), not a ban on arbitrary values.

Token families:

- `background` / `foreground` — the page.
- `surface` / `surface-subtle` / `surface-elevated` — panels above the page,
  in increasing prominence. Elevation beyond this is mostly a `shadow-sm` on
  `surface-elevated`, used sparingly — see Elevation below.
- `muted` / `muted-foreground` — de-emphasized fills and secondary text.
- `border` / `border-strong` / `input` / `ring` — separation and focus.
- `primary` (+ `-hover` / `-active` / `-foreground` / `-subtle` /
  `-border`) — the brand accent, Clay. See Primary color below.
- `secondary` / `accent` (+ `-foreground` pairs) — neutral actions and
  emphasis that deliberately don't use the brand color, to preserve
  hierarchy against `primary`.
- `destructive` (+ `-foreground`), `success`, `warning` — status. These stay
  independent of `primary` — a brand-color change must never shift what
  "destructive" or "warning" mean.
- `pastel-sage` / `pastel-lavender` / `pastel-blue` / `pastel-peach` /
  `pastel-rose` — the restrained accent family. Always pair with the
  theme's own `foreground` token for text on top of them (light mode uses a
  pale fill with dark text; dark mode uses a desaturated, darker fill with
  light text) — never a dedicated per-pastel foreground token, and never as
  a text color themselves.

All token pairs were verified against WCAG contrast math (OKLCH → linear
sRGB → relative luminance) before landing: body text pairs land at 10–17:1
in both themes, well past the 4.5:1 AA floor, and the focus `ring` lands at
12–17:1 against `background`. `border` / `border-strong` are intentionally
low-contrast (~1.3–1.8:1) — they're decorative separation, not the sole
carrier of any required state; focus and selection always use `ring` too.

### Radius

`--radius` (0.5rem / 8px, buttons' own radius) is the base;
`--radius-sm/md/lg/xl` step from it (4 / 8 / 12 / 12px) and back Tailwind's
`rounded-sm/md/lg/xl` utilities directly — inputs tighter (`sm`, 4px) than
buttons/standard controls (`md`, 8px), artwork/cards/dialogs at the
system's ceiling (`lg`/`xl`, both 12px — never exceeded; "sharp-but-soft,
not pillowy"). Every poster/backdrop/artwork image in the product uses
`rounded-lg` (see `MediaPoster`, `MediaDetailHero`) so portraits read as
"framed prints," not browser-default square thumbnails. `rounded-full`
(pills) is reserved for things that behave like tags, filters, or compact
status indicators — not general containers or buttons.

### Elevation

No drop shadows anywhere — hierarchy comes from spacing, typography, and
the surface tokens first; a genuinely floating overlay (menus, popovers,
dialogs, `surface-elevated`) gets a hairline border instead. This is a
*central* rule, not a per-component one: `--shadow-sm/md/lg/xl` (in
`globals.css`'s `@theme inline` block) are redefined to a 1–1.5px **inset**
ring using `--border`/`--border-strong` rather than Tailwind's default
blur — every existing `shadow-*` utility class in the app already resolves
to a hairline ring with zero per-file migration. A component that also
renders a literal `border border-border` alongside `shadow-sm` is
double-drawing the same edge — drop the `shadow-*` class in that case (see
`Dialog`/`Popover`/`DropdownMenu`/`Select`) rather than keeping both.

Dark mode's `surface-elevated` deliberately **inverts** the usual "raised
= lighter" rule for exactly this token: modals/sheets/overlays recede
toward near-black (darker than the canvas, not lighter) so the overlay's
own content — often full-bleed artwork — becomes the one lit thing on
screen, mirroring the reference's Carbon-surface behavior. Ordinary card
surfaces (`--surface`) still sit a normal step lighter than the canvas.

### Primary color — Clay

The product's one signature accent — MEDIO's own warm terracotta identity
(hue 42 in OKLCH), not the reference's literal magenta (see "Visual
language" above). Pushed from the previous "muted, dusty terracotta" to a
genuinely saturated "spotlight" accent (much higher chroma) so a single
instance of it reads as the one deliberately lit thing on a near-black
page — the whole point of a one-accent system. Its hue still sits clear of
`destructive` (25, more red) and `warning` (70, more gold), so a brand
color change here must never make status colors ambiguous.

**Gold** (`--gold`/`--gold-foreground`/`--gold-subtle`/`--gold-border`) is
the one secondary editorial accent, adapted from the reference's own
category-pill/section-highlight color — sparing use only, for taste/genre
highlights and section eyebrow labels (see Landing's own section labels,
`/design-system`'s "Gold" section). It is never a second primary: it never
appears on a button, a focus ring, or anything that reads as an
action. Primary answers "what can I do here"; Gold answers "what kind of
thing is this."

`primary-hover` and `primary-active` are hand-tuned palette stops, not
opacity tricks — interactive states deepen the color *away* from the page
background: light mode (dark clay on light page) gets darker on hover/press;
dark mode (lighter clay on dark page) gets lighter on hover, darker
("grounded") on press.

Usage:

- **Use it for:** the primary Button/IconButton, checked/on state of
  Checkbox/Radio/Switch, the Tabs active indicator, the Progress fill, the
  global focus ring (`ring` is aliased to `primary`), and one small
  restrained detail in navigation (the 1px active-route marker in
  `DesktopNav`/`MobileNav` — not the nav text or icons, which stay neutral).
- **Don't use it for:** body text, page titles, every icon, every badge
  (only `positive` status happens to share its hue family, and that's a
  separate token — see below), borders around every section, or
  navigation/dialog/dropdown backgrounds. The app should read as neutral
  with one accent, never as "a clay-themed app."

`primary-subtle` is a soft tinted fill (selected rows, quiet highlights) —
pairs with the theme's own `foreground` for text on top of it, same pattern
as the pastel accents; no dedicated `primary-subtle-foreground` token, since
`foreground` on it already lands at 12–13:1 contrast in both themes.
`primary-border` is a lighter/mid clay stop for borders on selected
surfaces — intentionally lower-contrast (~2.3:1), the same "decorative
separation, not the sole state carrier" role as `border-strong`.

`primary` is a fully separate token family from the pastel accents —
`Badge`'s `positive` variant uses `pastel-sage`, not `primary`, on purpose,
so a future brand-color change doesn't accidentally recolor "watched"
status. The pastels remain a secondary, supporting palette; Clay is the one
color meant to register as the product's signature.

## Themes

Light, dark, and system, via [`next-themes`](https://github.com/pacocoursey/next-themes)
(`src/components/theme-provider.tsx`), attribute `class` on `<html>`.
Tailwind's `dark:` variant is wired to that class with
`@custom-variant dark (&:is(.dark *))` in `globals.css` rather than
`prefers-color-scheme`, so an explicit choice always wins over the OS.

`next-themes` injects a blocking pre-hydration script that sets the class
before paint — no flash, no flicker. `<html suppressHydrationWarning>` in
the root layout is required because the server can't know the client's
theme; that's the only hydration-warning suppression theming needs.

Theme is a real Settings control now (`ThemeSetting`,
`src/features/settings/theme-setting.tsx` — System/Light/Dark with a
miniature visual preview per option), not a standalone nav icon — see
docs/settings.md, "Theme architecture" for the full precedence model
(database record vs. next-themes' own per-browser localStorage). Dark is
this system's primary, most faithful expression of the reference visual
language (see "Visual language" above); Light is a deliberately designed
counterpart from the same relationships, never left as an inverted
afterthought — both get reviewed together, every time.

## Wordmark

`Wordmark` (`src/components/shell/wordmark.tsx`) renders the MEDIO brand
mark — used at the top of the desktop nav rail and in the mobile header
strip, nowhere else. Deliberately not the application's own UI typeface
(Geist Sans): it's set in **Instrument Serif**, a display serif chosen
specifically for the brand mark — clean, confident letterforms built for
large sizes, reading as editorial/premium without the ornamental
flourish of a script or luxury-fashion serif, and without the generic-
SaaS or futuristic-gaming connotations a geometric sans would carry.
Typography-only: uppercase, restrained tracking (not the wide spaced-out
treatment generic logotypes default to), `text-primary` (Clay) — no
icon, no badge, no container. Loaded via `next/font/google`, mocked in
`src/test/setup.ts` since font-loader calls only resolve inside Next's
own build (a plain Vitest run can't use them).

## Components

`src/components/ui/` holds every low-level primitive. Each one starts from
Radix (via the `radix-ui` package) where real interaction/accessibility
behavior is needed — focus management, keyboard behavior, overlay
positioning — then the visual layer is fully owned and redesigned; nothing
should look like default shadcn simply because that's how it was generated.
Primitives with no complex behavior (Badge, Spinner, Skeleton, Input,
Textarea) are plain Tailwind, no Radix dependency.

Current primitives: `Button`, `IconButton`, `Input`, `Textarea`, `Checkbox`,
`RadioGroup`, `SegmentedControl`, `Switch`, `Tabs`, `LinkTabs`, `Badge`,
`Progress`, `Spinner`, `Skeleton`, `Separator`, `Tooltip`, `DropdownMenu`,
`Popover`, `Dialog`. Every one of them has a live example at
[`/design-system`](/design-system) (local development only — see below) —
that page is the visual inventory of the `ui/` layer; check it before
adding a new primitive or duplicating an existing one.

Notes on a few:

- **Button** has no `icon` size — use `IconButton` for icon-only controls.
  Its `aria-label` is required at the type level, not just convention.
- **Button loading** shows a spinner and makes its label `invisible` (not
  removed), so the button doesn't resize when toggling loading state.
- **Button forwards `ref`** (explicitly destructured and reattached, not
  left inside a prop spread — a plain prop spread does not reliably wire
  up a host element's ref) — needed by any caller that manages focus
  after a dynamic UI swap, e.g. Up Next's Mark Watched → Undo transition
  (`features/home/up-next-mark-watched-button.tsx`).
- **Tabs** uses a typography-led underline indicator, not the boxed gray
  segmented-control look most component libraries default to. It has no
  current production consumer — every real "tabs" need in the app so far
  has actually been a real navigation (see **LinkTabs**), which is the
  deliberate reason it's kept small and generic rather than grown further;
  it stays as real, correct infrastructure for a genuine same-page panel
  switch if one is ever needed, not dead weight to delete.
- **LinkTabs** is `Tabs`' real-navigation sibling — the shared underline
  visual, but a `<nav>` of `<Link>`s with `aria-current`, for a "tab" that
  is actually a new URL (`?tab=`, `?type=`, `?view=`, ...). Every current
  tab-like control in the product (Stats Overview/Taste, Discover Movies/
  Shows, Library media type, Diary type, Calendar view, Filmography role)
  uses this — it used to be six independent copies of the same classes
  before being consolidated here.
- **SegmentedControl** is a compact bordered single-select strip (Pick for
  Me's Format/Time, Settings' `TextChoice`) — real `RadioGroup` semantics
  underneath, a different shape from `RadioGroup`'s own vertical dot-list
  (a handful of short options picked inline vs. a longer list in a form).
  `RadioGroup`/`RadioGroupItem` likewise have no current production
  consumer for the same reason `Tabs` doesn't — kept as correct, available
  infrastructure for a real dot-list use case, not because a real one
  exists today.
- **Checkbox** also has no current production consumer — Episode tracking
  deliberately never renders one (see CLAUDE.md, "Episode tracking
  controls must not resemble a task checklist"), which is the one place a
  naive implementation might otherwise reach for it. Kept for a genuine
  future multi-select need, same reasoning as `RadioGroup`.
- **Dialog**'s overlay is plain `bg-black/50` regardless of theme — a scrim
  dims what's behind it in both themes, which is a lighting effect, not a
  semantic color, so it's a deliberate exception to "tokens only."

`src/components/shell/` and `src/components/` (outside `ui/`) hold app-level
composed components built from these primitives — not part of the reusable
primitive layer, don't need a `/design-system` entry.

New primitives are added only when a real screen needs one, starting from
Radix if the interaction is non-trivial, then redesigned the same way the
current set was — never left in default shadcn styling.

## `/design-system`

Internal UI reference — not a product page, not Storybook, not a component
marketplace. It exists to answer "which primitive/variant/size/state should
I use, and how does it look in both themes?" for future work on this
codebase.

It's local-development-only by construction: the page checks
`process.env.NODE_ENV` itself and calls `notFound()` in production, so this
isn't just "not linked" — the route resolves to a real 404 in a production
build regardless of whether someone finds the URL. It isn't part of primary
or secondary navigation.

## Contribution rules

- Use semantic tokens (`bg-surface`, `text-muted-foreground`, ...); never a
  raw color value in a component (the `Dialog` overlay scrim is the one
  documented exception, and it's explained inline).
- Reuse `src/components/ui/` primitives before writing new markup that
  duplicates one — check `/design-system` first.
- Preserve the focus-ring treatment (`focus-visible:ring-3 ring-ring/50`) on
  any new interactive element — don't remove outline behavior without it.
- Give every icon-only control a real accessible name (prefer `IconButton`,
  which requires one).
- Respect `prefers-reduced-motion` (already handled globally); don't add
  motion that ignores it, and don't reach for `transition-all` — animate
  specific properties.
- Don't add a new UI dependency (icon set, animation library, component
  kit) without a concrete, current need.
