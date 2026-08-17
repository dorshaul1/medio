"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Command, CommandRunContext } from "./types";

// One row shape for every command — restrained icon, label, optional
// context line, optional shortcut hint (see docs/search.md, "Command
// Center": visually distinguishable from a media result without a loud
// badge — no artwork, just an icon). A navigation command renders as a
// real `<Link>`; an action command renders as a `<button>` that calls
// `run` — both carry `data-search-result` so the dialog's existing
// keyboard-navigation logic (see command-center-dialog.tsx) treats every
// row, media or command, identically.
export function CommandRow({
  command,
  runContext,
}: {
  command: Command;
  // Everything but `router`, supplied by the dialog per-render — see
  // `command-center-dialog.tsx`. Deliberately no separate "onActivate"
  // callback here: an action command decides its own follow-up (close
  // the dialog, or switch to a nested step) via `runContext.close()`/
  // `runContext.openLogWatched()`, since only the command itself knows
  // whether it's terminal (e.g. Up Next) or a step into something else
  // (e.g. "Log watched"). A navigation command always closes, the same
  // "leaving to a new page" behavior every other search result already
  // has.
  runContext: Omit<CommandRunContext, "router">;
}) {
  const router = useRouter();
  const Icon = command.icon;

  const content = (
    <>
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{command.label}</span>
      {command.context ? (
        <span className="shrink-0 text-xs text-muted-foreground">{command.context}</span>
      ) : null}
      {command.shortcut ? (
        <span
          aria-hidden="true"
          className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground/70"
        >
          {command.shortcut}
        </span>
      ) : null}
    </>
  );

  const className =
    "flex w-full min-w-0 items-center gap-3 rounded-md p-2 text-left outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  if ("href" in command) {
    return (
      <Link href={command.href} data-search-result onClick={runContext.close} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      data-search-result
      className={className}
      onClick={() => void command.run({ router, ...runContext })}
    >
      {content}
    </button>
  );
}
