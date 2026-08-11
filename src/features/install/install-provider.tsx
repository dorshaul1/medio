"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  deriveInstallPromotionState,
  type InstallCapability,
  type InstallPromotionState,
  isIosSafari,
  isMobileUserAgent,
  isStandaloneDisplayMode,
} from "./install-policy";

// Chrome/Edge/Android fire this instead of showing their own install UI
// automatically — capturing it lets MEDIO offer install from its own
// deliberate, contextual places (mobile Settings, mobile Landing)
// instead of the browser's default mini-infobar. Not in lib.dom.d.ts
// yet, hence the local shape. Deliberately kept out of React state
// itself (see `deferredPromptRef` below) — a live browser event object
// shouldn't be treated as serializable render data.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallContextValue = {
  state: InstallPromotionState;
  // Only meaningful when `state.kind === "direct"`; a no-op otherwise —
  // callers don't need to check first, but should still only ever call
  // this from a real user interaction (see docs/pwa.md, "User-initiated
  // only" — this app never invokes the browser's install UI on its
  // own).
  promptInstall: () => Promise<void>;
};

const InstallContext = createContext<InstallContextValue | null>(null);

// The one centralized installation domain — see docs/pwa.md, "Install
// promotion policy". Listens for `beforeinstallprompt`/`appinstalled`
// exactly once, at the root of the app, and derives one
// `InstallPromotionState` that both mobile Settings
// (`InstallAppSetting`) and mobile Landing (`MobileInstallAction`)
// consume through `useInstall()` — never a second, independent listener
// per surface.
export function InstallProvider({ children }: { children: ReactNode }) {
  const [capability, setCapability] = useState<InstallCapability>({
    isMobile: false,
    isStandalone: false,
    hasDeferredPrompt: false,
    isIosSafari: false,
  });
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setCapability({
      isMobile: isMobileUserAgent(window.navigator.userAgent, window.navigator.maxTouchPoints),
      isStandalone: isStandaloneDisplayMode(
        window.matchMedia?.bind(window),
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      ),
      hasDeferredPrompt: false,
      isIosSafari: isIosSafari(window.navigator.userAgent),
    });

    function onBeforeInstallPrompt(event: Event) {
      // Suppresses the browser's own default mini-infobar — MEDIO's own
      // contextual controls are the deliberate install entry points.
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCapability((current) => ({ ...current, hasDeferredPrompt: true }));
    }
    function onInstalled() {
      deferredPromptRef.current = null;
      setCapability((current) => ({ ...current, isStandalone: true, hasDeferredPrompt: false }));
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const deferred = deferredPromptRef.current;
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // The event can only ever be used once — cleared regardless of
    // outcome (accepted or dismissed) so a stale reference is never
    // reused.
    deferredPromptRef.current = null;
    setCapability((current) => ({ ...current, hasDeferredPrompt: false }));
  }, []);

  const state = deriveInstallPromotionState(capability);

  return (
    <InstallContext.Provider value={{ state, promptInstall }}>{children}</InstallContext.Provider>
  );
}

export function useInstall(): InstallContextValue {
  const value = useContext(InstallContext);
  if (!value) throw new Error("useInstall must be used within an InstallProvider");
  return value;
}
