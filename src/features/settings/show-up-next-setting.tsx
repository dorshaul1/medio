"use client";

import { useRef, useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { updatePreferencesAction } from "./settings-actions";

// A plain Switch, not a visual choice — deliberately never presented
// alongside Home layout's three options as if it were a fourth one (see
// docs/settings.md, "Switch usage" / "Home layout"). Independent of
// `homeLayout`: this only ever controls whether Up Next renders at the
// top of Home, in every layout — see docs/home.md, "Up Next is a
// separate preference".
export function ShowUpNextSetting({ value }: { value: boolean }) {
  const [checked, setChecked] = useState(value);
  const [, startTransition] = useTransition();
  const requestId = useRef(0);

  function toggle(next: boolean) {
    const id = ++requestId.current;
    setChecked(next);
    startTransition(async () => {
      try {
        await updatePreferencesAction({ showUpNext: next });
      } catch {
        if (requestId.current === id) setChecked(!next);
      }
    });
  }

  return <Switch checked={checked} onCheckedChange={toggle} aria-label="Show Up Next" />;
}
