"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// The one client-side PWA concern this app needs: register the Service
// Worker (production only — see docs/pwa.md, "Production-only
// registration"), and surface a restrained "A new version of MEDIO is
// ready" prompt once an update is genuinely waiting. Never an automatic
// reload — see docs/pwa.md, "Update lifecycle": user data safety (an
// in-progress note, form, or Settings change) always wins over
// activating an update immediately. Mounted once in the root layout so
// it covers both the public Landing/auth routes and the authenticated
// shell — installability/updates aren't an authenticated-only concern.
export function PwaManager() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (cancelled) return;

        // Already-waiting worker from a previous visit this session.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            // `controller` only exists once a worker has ever taken
            // control — its absence means this is the very first
            // install, not an update, so there's nothing to prompt.
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(installing);
            }
          });
        });
      })
      .catch(() => {
        // Registration failing (unsupported browser, blocked storage,
        // ...) is never fatal — MEDIO remains a fully working web app
        // without it (see docs/pwa.md, "Progressive enhancement").
      });

    let reloaded = false;
    function handleControllerChange() {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!waitingWorker) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4 md:bottom-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-4 py-3 shadow-sm">
        <p className="text-sm text-foreground">A new version of MEDIO is ready.</p>
        <Button size="sm" onClick={() => waitingWorker.postMessage("SKIP_WAITING")}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
