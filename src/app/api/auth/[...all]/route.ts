import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Better Auth owns this entire HTTP boundary — no custom auth endpoints
// alongside it.
export const { GET, POST } = toNextJsHandler(auth);
