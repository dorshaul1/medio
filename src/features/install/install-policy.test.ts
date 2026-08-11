import { describe, expect, it, vi } from "vitest";
import {
  deriveInstallPromotionState,
  isIosSafari,
  isMobileUserAgent,
  isStandaloneDisplayMode,
} from "./install-policy";

const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/604.1";
const CHROME_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
const CHROME_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const SAFARI_MAC_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const SAFARI_IPAD_MODERN = SAFARI_MAC_DESKTOP; // iPadOS Safari's real default UA

describe("deriveInstallPromotionState", () => {
  it("never promotes on desktop, regardless of any other capability", () => {
    expect(
      deriveInstallPromotionState({
        isMobile: false,
        isStandalone: false,
        hasDeferredPrompt: true,
        isIosSafari: false,
      }),
    ).toEqual({ kind: "not-promoted" });
  });

  it("shows no action once already installed on mobile", () => {
    expect(
      deriveInstallPromotionState({
        isMobile: true,
        isStandalone: true,
        hasDeferredPrompt: false,
        isIosSafari: false,
      }),
    ).toEqual({ kind: "installed" });
  });

  it("prefers the direct programmatic prompt when available on mobile", () => {
    expect(
      deriveInstallPromotionState({
        isMobile: true,
        isStandalone: false,
        hasDeferredPrompt: true,
        isIosSafari: false,
      }),
    ).toEqual({ kind: "direct" });
  });

  it("offers manual instructions on iOS Safari with no programmatic prompt", () => {
    expect(
      deriveInstallPromotionState({
        isMobile: true,
        isStandalone: false,
        hasDeferredPrompt: false,
        isIosSafari: true,
      }),
    ).toEqual({ kind: "manual" });
  });

  it("is unsupported on mobile with neither a prompt nor iOS Safari", () => {
    expect(
      deriveInstallPromotionState({
        isMobile: true,
        isStandalone: false,
        hasDeferredPrompt: false,
        isIosSafari: false,
      }),
    ).toEqual({ kind: "unsupported" });
  });

  it("installed status wins even if a deferred prompt is still technically present", () => {
    expect(
      deriveInstallPromotionState({
        isMobile: true,
        isStandalone: true,
        hasDeferredPrompt: true,
        isIosSafari: false,
      }),
    ).toEqual({ kind: "installed" });
  });
});

describe("isMobileUserAgent", () => {
  it("is true for phones and Android", () => {
    expect(isMobileUserAgent(SAFARI_IPHONE, 0)).toBe(true);
    expect(isMobileUserAgent(CHROME_ANDROID, 5)).toBe(true);
  });

  it("is false for a real desktop Mac (no touch points)", () => {
    expect(isMobileUserAgent(SAFARI_MAC_DESKTOP, 0)).toBe(false);
    expect(isMobileUserAgent(CHROME_DESKTOP, 0)).toBe(false);
  });

  it("recognizes a modern iPad despite its desktop-class user agent, via real touch support", () => {
    expect(isMobileUserAgent(SAFARI_IPAD_MODERN, 5)).toBe(true);
    // The same UA with no touch points is a real Mac, not an iPad.
    expect(isMobileUserAgent(SAFARI_IPAD_MODERN, 0)).toBe(false);
  });
});

describe("isIosSafari", () => {
  it("is true for real Safari on iPhone", () => {
    expect(isIosSafari(SAFARI_IPHONE)).toBe(true);
  });

  it("is false for a non-Safari browser on iOS", () => {
    expect(isIosSafari(CHROME_IPHONE)).toBe(false);
  });

  it("is false on non-iOS platforms regardless of browser", () => {
    expect(isIosSafari(CHROME_ANDROID)).toBe(false);
    expect(isIosSafari(CHROME_DESKTOP)).toBe(false);
  });
});

describe("isStandaloneDisplayMode", () => {
  function fakeMatchMedia(matches: boolean): typeof window.matchMedia {
    return vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
  }

  it("is true when the display-mode media query matches", () => {
    expect(isStandaloneDisplayMode(fakeMatchMedia(true), undefined)).toBe(true);
  });

  it("is true via iOS's own legacy standalone flag even if the media query doesn't match", () => {
    expect(isStandaloneDisplayMode(fakeMatchMedia(false), true)).toBe(true);
  });

  it("is false when neither signal indicates standalone", () => {
    expect(isStandaloneDisplayMode(fakeMatchMedia(false), false)).toBe(false);
    expect(isStandaloneDisplayMode(fakeMatchMedia(false), undefined)).toBe(false);
  });

  it("is false when matchMedia itself is unavailable", () => {
    expect(isStandaloneDisplayMode(undefined, undefined)).toBe(false);
  });
});
