// A miniature, literal representation of each theme option — see
// docs/settings.md, "Theme visual preview". Deliberately fixed, literal
// colors rather than semantic design tokens: the whole point of this
// component is to depict an *absolute* light or dark appearance
// regardless of the settings page's own current ambient theme (a "Dark"
// preview must look dark even while viewing this page in light mode), so
// the usual "never a raw color, always a token" rule doesn't apply here
// — see CLAUDE.md's own token guidance for when a genuinely fixed value
// is appropriate. Nothing else in the product should follow this
// exception.
const LIGHT = { bg: "#f3f1ee", chrome: "#e2ded9", text: "#3a3733", accent: "#b5693f" };
const DARK = { bg: "#232120", chrome: "#322f2d", text: "#d9d5d0", accent: "#c98a5e" };

function Surface({ colors }: { colors: typeof LIGHT }) {
  return (
    <div className="flex h-full w-full" style={{ backgroundColor: colors.bg }}>
      <div className="w-2" style={{ backgroundColor: colors.chrome }} />
      <div className="flex flex-1 flex-col gap-1 p-1.5">
        <div className="h-2 w-4 rounded-xs" style={{ backgroundColor: colors.accent }} />
        <div
          className="h-1 w-full rounded-full"
          style={{ backgroundColor: colors.text, opacity: 0.9 }}
        />
        <div
          className="h-1 w-2/3 rounded-full"
          style={{ backgroundColor: colors.text, opacity: 0.5 }}
        />
      </div>
    </div>
  );
}

export function ThemeMiniPreview({ variant }: { variant: "light" | "dark" | "system" }) {
  return (
    <div className="h-12 w-16 overflow-hidden rounded-sm">
      {variant === "system" ? (
        <div className="flex h-full w-full">
          <div className="w-1/2">
            <Surface colors={LIGHT} />
          </div>
          <div className="w-1/2">
            <Surface colors={DARK} />
          </div>
        </div>
      ) : (
        <Surface colors={variant === "light" ? LIGHT : DARK} />
      )}
    </div>
  );
}
