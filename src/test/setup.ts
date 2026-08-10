import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// `next/font/google` relies on Next's own compiler transform (a build-
// time macro, not a real runtime export) — it only works inside Next's
// own bundler, never under plain Vitest. Mocked globally here (once, for
// every test file) rather than per-component, the same reasoning
// `test/setup.ts` already applies to `matchMedia` below: this is a
// framework-boundary shim, not test-specific behavior. Real font loading
// is unaffected — this only ever runs under Vitest.
vi.mock("next/font/google", () => ({
  Instrument_Serif: () => ({ className: "font-wordmark-mock" }),
}));

// Vitest globals are disabled (explicit imports match the rest of the repo),
// so Testing Library's automatic afterEach cleanup can't detect a global
// test framework — register it explicitly instead.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia, but next-themes calls it to resolve
// the "system" preference. A minimal stub is enough for tests to run;
// `matches: false` resolves system preference to light.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
