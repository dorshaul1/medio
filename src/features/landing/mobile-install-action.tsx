"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InstallInstructionsDialog } from "@/features/install/install-instructions-dialog";
import { useInstall } from "@/features/install/install-provider";

// Landing's one contextual install action — see docs/pwa.md, "Install
// promotion policy": mobile-only by construction (`useInstall()`'s
// `state` already encodes that), so this never has to branch on
// platform itself. Renders nothing for `"not-promoted"` (desktop —
// installation stays purely informational there, told through the
// section's own copy/illustration), `"installed"`, or `"unsupported"` —
// the surrounding section still reads completely on its own without
// this ever mounting anything.
export function MobileInstallAction() {
  const { state, promptInstall } = useInstall();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  if (state.kind !== "direct" && state.kind !== "manual") return null;

  return (
    <>
      <Button onClick={state.kind === "direct" ? promptInstall : () => setInstructionsOpen(true)}>
        {state.kind === "direct" ? "Install MEDIO" : "Add to Home Screen"}
      </Button>
      <InstallInstructionsDialog open={instructionsOpen} onOpenChange={setInstructionsOpen} />
    </>
  );
}
