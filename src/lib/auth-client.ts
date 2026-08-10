import { createAuthClient } from "better-auth/react";

// Browser-side only — must never import database/server-env modules. The
// base URL is same-origin by default (Better Auth infers it from
// `window.location`), so no configuration is needed here.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
