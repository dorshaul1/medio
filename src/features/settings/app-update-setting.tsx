"use client";

import { Button } from "@/components/ui/button";
import { useServiceWorkerUpdate } from "@/features/pwa/service-worker-context";
import { SettingRow } from "./setting-row";

const STATUS_TEXT: Record<"checking" | "available" | "up-to-date" | "error", string> = {
  checking: "Checking for updates…",
  available: "Update available",
  "up-to-date": "MEDIO is up to date",
  error: "Couldn't check for updates.",
};

// Settings → General's own window into `ServiceWorkerProvider`'s shared
// state — never a second registration, see docs/pwa.md, "Update
// lifecycle". "Update now" activates the exact same waiting worker
// `PwaManager`'s own toast would; both call `applyUpdate()`.
export function AppUpdateSetting() {
  const { status, checkForUpdate, applyUpdate } = useServiceWorkerUpdate();

  return (
    <SettingRow
      title="App updates"
      comment="MEDIO checks for new versions automatically. Update now to apply a waiting version without reinstalling anything."
    >
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground" role="status">
          {STATUS_TEXT[status]}
        </p>
        {status === "available" ? (
          <Button size="sm" onClick={applyUpdate}>
            Update now
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            loading={status === "checking"}
            onClick={() => void checkForUpdate()}
          >
            Check for updates
          </Button>
        )}
      </div>
    </SettingRow>
  );
}
