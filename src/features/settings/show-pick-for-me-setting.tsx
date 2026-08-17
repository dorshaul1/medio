"use client";

import { useRef, useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { updatePreferencesAction } from "./settings-actions";

// A plain Switch — this only ever controls whether Home's header shows
// the "Pick for me" entry point; `/pick` itself stays fully reachable by
// direct URL regardless (see docs/recommendations.md).
export function ShowPickForMeSetting({ value }: { value: boolean }) {
  const [checked, setChecked] = useState(value);
  const [, startTransition] = useTransition();
  const requestId = useRef(0);

  function toggle(next: boolean) {
    const id = ++requestId.current;
    setChecked(next);
    startTransition(async () => {
      try {
        await updatePreferencesAction({ showPickForMe: next });
      } catch {
        if (requestId.current === id) setChecked(!next);
      }
    });
  }

  return <Switch checked={checked} onCheckedChange={toggle} aria-label="Show Pick for me" />;
}
