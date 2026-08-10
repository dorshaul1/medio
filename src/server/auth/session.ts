import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

// Server-only session access — the one place `headers()` gets forwarded to
// Better Auth for validation. Return type is Better Auth's own inferred
// session shape, never duplicated by hand.
export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

// For anything that must not render/execute without a signed-in user.
// This is a UX convenience (redirect to sign-in), not the data-security
// boundary — code that reads/writes user-owned data must still validate
// the session itself at that point; never trust that "this ran past
// requireSession()" up the call stack.
export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/sign-in");
  }

  return session;
}
