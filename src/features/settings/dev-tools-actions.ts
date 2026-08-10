"use server";

import { revalidatePath } from "next/cache";
import type { MockDataResult } from "@/server/dev-tools/mock-data";
import { seedMockData } from "@/server/dev-tools/mock-data";
import { resetAllUserData } from "@/server/dev-tools/reset-all-data";

// Thin Server Action wrappers, same shape as `settings-actions.ts` — the
// underlying functions each re-check `NODE_ENV` themselves (see
// `server/dev-tools/guard.ts`), so this file adds no additional
// production gating of its own, only the usual revalidation.

export async function seedMockDataAction(): Promise<MockDataResult> {
  const result = await seedMockData();
  revalidatePath("/", "layout");
  return result;
}

export async function resetAllDataAction(): Promise<void> {
  await resetAllUserData();
  revalidatePath("/", "layout");
}
