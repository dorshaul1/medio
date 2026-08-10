"use client";

import { useRef, useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { updatePreferencesAction } from "./settings-actions";

// The one true binary preference in this phase — a plain Switch, not a
// visual choice or segmented control (see docs/settings.md, "Switch
// usage").
export function FinishSoonSetting({ value }: { value: boolean }) {
  const [checked, setChecked] = useState(value);
  const [, startTransition] = useTransition();
  const requestId = useRef(0);

  function toggle(next: boolean) {
    const id = ++requestId.current;
    setChecked(next);
    startTransition(async () => {
      try {
        await updatePreferencesAction({ showFinishSoon: next });
      } catch {
        if (requestId.current === id) setChecked(!next);
      }
    });
  }

  return <Switch checked={checked} onCheckedChange={toggle} aria-label="Show Finish Soon" />;
}
