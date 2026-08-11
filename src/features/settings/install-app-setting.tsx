"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InstallInstructionsDialog } from "@/features/install/install-instructions-dialog";
import { useInstall } from "@/features/install/install-provider";
import { SettingRow } from "./setting-row";

// The one deliberate MEDIO-owned install entry point in Settings — see
// docs/pwa.md, "Install promotion policy": mobile-only by design.
// `useInstall()`'s `state` already encodes that policy (`"not-promoted"`
// on desktop, regardless of technical installability), so this
// component never has to re-derive or re-check platform logic itself —
// it only ever renders whatever the shared install domain says is true
// right now. Renders nothing at all (never a disabled button, never a
// "coming soon") for `"not-promoted"`/`"installed"`/`"unsupported"` —
// every visible setting must be real, per Settings' own rules.
export function InstallAppSetting() {
  const { state, promptInstall } = useInstall();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  if (state.kind !== "direct" && state.kind !== "manual") return null;

  return (
    <>
      <SettingRow
        title="Install MEDIO"
        comment="Add MEDIO to your Home Screen and use it like an app."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={state.kind === "direct" ? promptInstall : () => setInstructionsOpen(true)}
        >
          {state.kind === "direct" ? "Install" : "How to install"}
        </Button>
      </SettingRow>
      <Separator />
      <InstallInstructionsDialog open={instructionsOpen} onOpenChange={setInstructionsOpen} />
    </>
  );
}
