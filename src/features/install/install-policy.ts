// The installation domain's pure policy layer — no I/O, no React. See
// docs/pwa.md, "Install promotion policy" and CLAUDE.md, "PWA":
// **installability** (can the browser/platform install MEDIO at all)
// and **install promotion** (should MEDIO show its own installation UI
// right now) are two separate concepts, modeled as two separate types
// here rather than one conflated boolean. MEDIO remains a proper
// standards-based installable PWA everywhere; `InstallPromotionState` is
// the one place the deliberate "promote on mobile, stay quiet on
// desktop" product decision actually lives — see docs/pwa.md, "Final
// installation strategy".

// The raw, observable facts about the current browser/device — always
// computed client-side (see `install-provider.tsx`), never assumed.
export type InstallCapability = {
  isMobile: boolean;
  isStandalone: boolean;
  hasDeferredPrompt: boolean;
  isIosSafari: boolean;
};

// What MEDIO's own UI should actually do right now — derived from
// `InstallCapability`, never stored, never guessed ahead of the real
// browser signals.
export type InstallPromotionState =
  // Desktop — MEDIO's own install UI never appears here, regardless of
  // whether the browser could technically install it. Browser/OS-native
  // installation (a Chrome address-bar icon, a browser menu item, ...)
  // is completely unaffected by this — MEDIO simply never spends its
  // own product UI promoting it.
  | { kind: "not-promoted" }
  // Mobile, already running standalone — no redundant install action.
  | { kind: "installed" }
  // Mobile, the browser exposes a real programmatic install prompt
  // (`beforeinstallprompt` — Chrome/Edge/Android).
  | { kind: "direct" }
  // Mobile, no programmatic prompt exists (iOS Safari) — a real install
  // path, just a manual "Add to Home Screen" one.
  | { kind: "manual" }
  // Mobile, neither path is available — MEDIO shows no install UI at
  // all rather than a broken/dead action.
  | { kind: "unsupported" };

export function deriveInstallPromotionState(capability: InstallCapability): InstallPromotionState {
  if (!capability.isMobile) return { kind: "not-promoted" };
  if (capability.isStandalone) return { kind: "installed" };
  if (capability.hasDeferredPrompt) return { kind: "direct" };
  if (capability.isIosSafari) return { kind: "manual" };
  return { kind: "unsupported" };
}

// Pure string logic — trivially unit-testable, unlike the DOM-dependent
// checks in `install-provider.tsx`. Real phones/tablets only: modern
// iPadOS Safari deliberately reports a desktop-class "Macintosh" user
// agent (Apple's own documented compatibility behavior, not a bug to
// work around) — `maxTouchPoints > 1` is the one reliable signal that
// distinguishes a real iPad from an actual Mac in that case.
export function isMobileUserAgent(userAgent: string, maxTouchPoints: number): boolean {
  const isPhoneOrTablet = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  const isModernIpad = /macintosh/i.test(userAgent) && maxTouchPoints > 1;
  return isPhoneOrTablet || isModernIpad;
}

// iOS Safari specifically — the one major mobile platform with no
// programmatic `beforeinstallprompt` event, so it's the one case worth
// a manual "Add to Home Screen" instruction instead of an automatic
// install button. Excludes other iOS browsers (Chrome/Firefox/Edge on
// iOS all share Safari's underlying WebKit engine and UA string, but
// don't expose Safari's own Share-sheet install path).
export function isIosSafari(userAgent: string): boolean {
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const isOtherIosBrowser = /crios|fxios|edgios|opios/i.test(userAgent);
  return isIos && !isOtherIosBrowser;
}

// Whether the app is currently running installed (standalone display
// mode) — the modern `display-mode` media query on every platform that
// supports installation, plus iOS Safari's own older
// `navigator.standalone` flag (iOS never matched `display-mode`
// reliably before recent versions).
export function isStandaloneDisplayMode(
  matchMedia: typeof window.matchMedia | undefined,
  iosStandaloneFlag: boolean | undefined,
): boolean {
  const matchesDisplayModeQuery = matchMedia?.("(display-mode: standalone)").matches ?? false;
  return matchesDisplayModeQuery || iosStandaloneFlag === true;
}
