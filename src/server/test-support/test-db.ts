import "./test-env";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

// A throwaway user row so DB integration tests (tracking, planning, ...)
// can satisfy the real FK constraint on every user-owned table without
// touching real application data. Deleting it cascades away every row
// the test created (`onDelete: "cascade"` on each domain's `userId`
// column) — no manual per-table cleanup needed. IDs are random per call
// so parallel test files/workers never collide.
export async function createTestUser(): Promise<string> {
  const id = `test-user-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Integration Test User",
    email: `${id}@example.invalid`,
  });
  return id;
}

export async function deleteTestUser(id: string): Promise<void> {
  await db.delete(user).where(eq(user.id, id));
}
