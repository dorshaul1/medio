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

// One shared Service Worker registration + update-check state — see
// docs/pwa.md, "Update lifecycle". `PwaManager`'s floating "A new
// version is ready" toast and Settings → General's "App updates" row
// both read from this single source instead of each registering their
// own worker, which would double-register and could race on which one
// actually calls `skipWaiting()`.
//
// `status` only ever reflects a real, observed fact:
// - `checking` — a check is in flight right now (mount, manual, or
//   periodic/visibility-triggered).
// - `available` — a new worker has finished installing and is waiting;
//   `applyUpdate()` activates it.
// - `up-to-date` — the most recent check found nothing newer.
// - `error` — registration or the most recent check itself failed
//   (unsupported browser, network failure, blocked storage, ...); never
//   fatal to the rest of the app (see docs/pwa.md, "Progressive
//   enhancement") — this only affects what this one row/toast shows.
export type ServiceWorkerUpdateStatus = "checking" | "available" | "up-to-date" | "error";

type ServiceWorkerContextValue = {
  status: ServiceWorkerUpdateStatus;
  checkForUpdate: () => Promise<void>;
  applyUpdate: () => void;
};

const ServiceWorkerContext = createContext<ServiceWorkerContextValue | null>(null);

// Real browsers can take a beat between `registration.update()`
// resolving and a genuinely newer worker actually reaching `waiting` —
// this is the one place that timing assumption lives, not duplicated
// across every caller.
const UPDATE_SETTLE_DELAY_MS = 1500;
// How often an already-open tab re-checks on its own, beyond the
// checks the browser already runs on real navigations — long enough to
// never meaningfully add network chatter, short enough that an
// installed PWA left open for a workday still finds a same-day deploy.
const PERIODIC_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// A client-side navigation (Next's router fetching a route's own JS
// chunk/RSC payload by hashed filename) fails outright once a newer
// deploy has replaced those files — the request 404s, and either the
// browser throws "Loading chunk ... failed" or it tries to parse the
// 404 HTML response as JS, throwing "Unexpected token '<'" (a
// `SyntaxError`, exactly what a stuck-on-a-stale-build Home nav click
// throws — see docs/pwa.md, "Stale-chunk recovery"). This is a genuinely
// broken page, not a "there's an optional update" prompt (see
// `PwaManager`) — the normal "never auto-reload while the user might be
// mid-edit" rule doesn't apply, because the page has already crashed.
// `sessionStorage` guards against a real broken deploy looping forever
// (a timestamp, not a one-shot flag, so a tab that reloads once, browses
// successfully for a while, then hits a *later* deploy's stale chunk
// still gets to recover again — only a tight repeat within the same
// failure gets suppressed).
const STALE_CHUNK_RELOAD_KEY = "medio-stale-chunk-reload-at";
const STALE_CHUNK_RELOAD_COOLDOWN_MS = 15_000;
const STALE_CHUNK_PATTERN =
  /Loading chunk [\w.-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|Unexpected token ['"]?<|is not valid JSON/i;

function isStaleChunkError(message: string): boolean {
  return STALE_CHUNK_PATTERN.test(message);
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ServiceWorkerUpdateStatus>("checking");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const supportedRef = useRef(true);

  const settleFromWaiting = useCallback(() => {
    const registration = registrationRef.current;
    setStatus(registration?.waiting ? "available" : "up-to-date");
  }, []);

  const checkForUpdate = useCallback(async () => {
    const registration = registrationRef.current;
    if (!supportedRef.current || !registration) {
      setStatus("error");
      return;
    }
    setStatus("checking");
    try {
      await registration.update();
      await new Promise((resolve) => setTimeout(resolve, UPDATE_SETTLE_DELAY_MS));
      settleFromWaiting();
    } catch {
      setStatus("error");
    }
  }, [settleFromWaiting]);

  const applyUpdate = useCallback(() => {
    registrationRef.current?.waiting?.postMessage("SKIP_WAITING");
  }, []);

  useEffect(() => {
    function recoverFromStaleChunk() {
      try {
        const lastReloadAt = Number(window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY));
        if (lastReloadAt && Date.now() - lastReloadAt < STALE_CHUNK_RELOAD_COOLDOWN_MS) return;
        window.sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now()));
      } catch {
        // Storage blocked (private browsing, quota) — still worth one
        // reload attempt, just without the loop guard.
      }
      window.location.reload();
    }
    function handleGlobalError(event: ErrorEvent) {
      if (isStaleChunkError(event.message)) recoverFromStaleChunk();
    }
    function handleGlobalRejection(event: PromiseRejectionEvent) {
      if (isStaleChunkError(errorMessage(event.reason))) recoverFromStaleChunk();
    }
    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleGlobalRejection);

    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      supportedRef.current = false;
      setStatus("error");
      return () => {
        window.removeEventListener("error", handleGlobalError);
        window.removeEventListener("unhandledrejection", handleGlobalRejection);
      };
    }

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (cancelled) return;
        registrationRef.current = registration;

        // Already-waiting worker from a previous visit this session —
        // reflect it immediately rather than waiting for the next
        // periodic check.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setStatus("available");
        } else {
          settleFromWaiting();
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // `controller` only exists once a worker has ever taken
            // control — its absence means this is the very first
            // install, not an update, so there's nothing to surface.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setStatus("available");
            }
          });
        });
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    let reloaded = false;
    function handleControllerChange() {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void checkForUpdate();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const intervalId = window.setInterval(() => void checkForUpdate(), PERIODIC_CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleGlobalRejection);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
    // `checkForUpdate`/`settleFromWaiting` are both stable `useCallback`s
    // (see above) — listing them is correct, not a source of re-runs.
  }, [checkForUpdate, settleFromWaiting]);

  return (
    <ServiceWorkerContext.Provider value={{ status, checkForUpdate, applyUpdate }}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorkerUpdate(): ServiceWorkerContextValue {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error("useServiceWorkerUpdate must be used within a ServiceWorkerProvider");
  }
  return context;
}
