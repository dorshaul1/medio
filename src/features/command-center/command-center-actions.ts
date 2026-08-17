"use server";

import { getPersonalHome } from "@/server/home/queries";
import type { ActiveShowContinuation } from "@/server/home/types";

// The Command Center's own bounded fetch for its one dynamic command (see
// docs/search.md, "Command Center") — reuses the exact same canonical
// Up Next derivation Home/Library/Show Details already share
// (`getPersonalHome`), never a second computation of "what's next". Only
// called once, when the dialog actually opens (not on every keystroke,
// not eagerly on mount) — see `command-center-dialog.tsx`.
export async function getUpNextCommandDataAction(): Promise<ActiveShowContinuation | null> {
  const { upNext } = await getPersonalHome();
  return upNext;
}
