import "server-only";
import { z } from "zod";
import {
  assertSafeDatabaseUrlForE2e,
  parseServerEnv,
  resolveBetterAuthUrl,
} from "@/config/env/schema";

// Fails fast, once, at first import — rather than letting a missing or
// malformed DATABASE_URL surface later as a confusing connection error.
function loadServerEnv() {
  try {
    const parsed = parseServerEnv({
      ...process.env,
      BETTER_AUTH_URL: resolveBetterAuthUrl(process.env),
    });
    // See schema.ts — a no-op outside an E2E run (see
    // playwright.config.ts's `webServer.env`), and a hard crash rather
    // than a silent connection if E2E's DATABASE_URL is ever anything but
    // local — see docs/production.md, "Production database safety
    // guards".
    assertSafeDatabaseUrlForE2e(process.env, parsed.DATABASE_URL);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
      throw new Error(`Invalid server environment configuration:\n${issues.join("\n")}`);
    }
    throw error;
  }
}

export const env = loadServerEnv();
