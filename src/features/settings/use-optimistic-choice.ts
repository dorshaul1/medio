"use client";

import { useRef, useState, useTransition } from "react";

// The shared optimistic single-select behavior behind `TextChoice` and
// `VisualChoice` (see docs/settings.md, "Settings save immediately") —
// the visible selection updates immediately; a failed write rolls back to
// the previous value. A monotonically increasing request id guards
// against a stale rejection clobbering a newer, still-in-flight
// selection. The two components differ only in how an option renders,
// never in this state machine — kept as one implementation rather than
// two copies of the same rollback logic.
export function useOptimisticChoice<T>(value: T, onChange: (value: T) => Promise<void>) {
  const [current, setCurrent] = useState(value);
  const [, startTransition] = useTransition();
  const requestId = useRef(0);

  function select(next: T) {
    const id = ++requestId.current;
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      try {
        await onChange(next);
      } catch {
        if (requestId.current === id) setCurrent(previous);
      }
    });
  }

  return { current, select };
}
