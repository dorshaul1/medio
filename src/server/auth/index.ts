import "server-only";
import { env } from "@/config/env/server";
import { createAuth } from "@/server/auth/config";
import { db } from "@/server/db";

export const auth = createAuth(db, env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL);
