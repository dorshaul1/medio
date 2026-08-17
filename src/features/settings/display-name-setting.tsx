"use client";

import { useRouter } from "next/navigation";
import { type KeyboardEvent, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

// Saves on blur (or Enter), not per keystroke — free text genuinely
// benefits from a confirmed save rather than firing a request on every
// character, same reasoning `MediaComment`'s editor already documents
// (see docs/opinions.md, "Auto save vs explicit save"). An empty/
// unchanged value is a silent no-op revert, never a request. On success,
// `router.refresh()` re-fetches the server-rendered tree so the sidebar/
// mobile header's own name (composed from the session in a Server
// Component) picks up the change immediately — this input is the only
// place that would otherwise go stale.
export function DisplayNameSetting({ value }: { value: string }) {
  const router = useRouter();
  const [name, setName] = useState(value);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const saved = useRef(value);
  // Escape reverts state and blurs in the same call, but the blur
  // listener below (`save`) runs before React has committed that revert
  // — closing over the still-stale draft otherwise. This flag lets
  // Escape's own blur skip that one save rather than persisting the
  // abandoned edit.
  const skipNextBlur = useRef(false);

  async function save() {
    if (skipNextBlur.current) {
      skipNextBlur.current = false;
      return;
    }

    const trimmed = name.trim();
    if (!trimmed || trimmed === saved.current) {
      setName(saved.current);
      setStatus("idle");
      return;
    }

    setStatus("pending");
    const { error } = await authClient.updateUser({ name: trimmed });
    if (error) {
      setStatus("error");
      return;
    }

    saved.current = trimmed;
    setName(trimmed);
    setStatus("idle");
    router.refresh();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      skipNextBlur.current = true;
      setName(saved.current);
      setStatus("idle");
      event.currentTarget.blur();
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="display-name" className="text-sm font-medium">
        Display name
      </label>
      <Input
        id="display-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        disabled={status === "pending"}
        aria-invalid={status === "error" ? true : undefined}
        aria-describedby={status === "error" ? "display-name-error" : undefined}
        className="max-w-xs"
      />
      {status === "error" ? (
        <p id="display-name-error" role="alert" className="text-sm text-destructive">
          Couldn't save your name. Try again.
        </p>
      ) : null}
    </div>
  );
}
