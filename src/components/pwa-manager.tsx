"use client";

import { Button } from "@/components/ui/button";
import { useServiceWorkerUpdate } from "@/features/pwa/service-worker-context";

// The one visible, unprompted surface for a waiting update — see
// docs/pwa.md, "Update lifecycle". Registration/detection itself lives
// in `ServiceWorkerProvider` (mounted once in the root layout, above
// this component); Settings → General's "App updates" row reads the
// exact same shared state, never a second registration. Never an
// automatic reload — user data safety (an in-progress note, form, or
// Settings change) always wins over activating an update immediately.
export function PwaManager() {
  const { status, applyUpdate } = useServiceWorkerUpdate();

  if (status !== "available") return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4 md:bottom-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-elevated px-4 py-3 shadow-sm">
        <p className="text-sm text-foreground">A new version of MEDIO is ready.</p>
        <Button size="sm" onClick={applyUpdate}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
