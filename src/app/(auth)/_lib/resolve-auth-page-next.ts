import "server-only";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { safeReturnPath } from "@/lib/safe-redirect";
import { getCurrentSession } from "@/server/auth/session";

// Shared by /sign-in and /sign-up (each page calls this itself — Next.js
// layouts don't receive `searchParams`, only pages do, so this can't
// live in a shared (auth) layout the way it used to). Two jobs: an
// already-authenticated visitor never sees an auth form at all (no
// flash, decided before anything renders) and always honors a validated
// `?next=` rather than always bouncing to `/`; a genuinely signed-out
// visitor gets the validated `next` back to thread through their form
// and the sign-in/sign-up switch link.
export async function resolveAuthPageNext(rawNext: string | string[] | undefined): Promise<string> {
  const next = safeReturnPath(Array.isArray(rawNext) ? rawNext[0] : rawNext, "");
  const session = await getCurrentSession();

  if (session) {
    // `next` is a runtime string validated by `safeReturnPath`, not a
    // literal Next.js knows about statically — same escape hatch
    // `mediaHref`/`DiscoverSearchInput` already use for the same reason.
    redirect((next || "/") as Route);
  }

  return next;
}
