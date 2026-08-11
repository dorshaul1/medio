"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// The one manual-installation surface — shared by mobile Settings
// (`InstallAppSetting`) and mobile Landing (`MobileInstallAction`), so
// the instructions are never duplicated or allowed to drift (see
// docs/pwa.md, "Manual install instructions"). Deliberately just a
// `Dialog`, not a dedicated documentation page, wizard, or new bottom-
// sheet primitive — see CLAUDE.md, "Avoid speculative abstractions":
// `Dialog` already scrolls internally and is width-constrained, and one
// short instruction doesn't justify a new primitive. Current, real
// iOS Safari behavior only (no other mobile browser lacks a
// programmatic install prompt at this app's current platform-support
// baseline — see `isIosSafari`, `install-policy.ts`).
export function InstallInstructionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add MEDIO to your Home Screen</DialogTitle>
          <DialogDescription>
            In Safari, tap the Share icon, then choose &ldquo;Add to Home Screen.&rdquo;
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
