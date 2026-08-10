import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

// A minimal liveness/readiness check for external monitoring — a real
// HTTP boundary (an uptime monitor, a deploy-verification curl), not
// something any Server Component/Action could call directly, so this is
// exactly the kind of API route CLAUDE.md's "Next.js / React" section
// allows. Deliberately returns nothing beyond "ok"/"error" — no schema
// details, no environment values, no provider tokens, no version
// strings. Never cached (a stale "ok" would defeat the entire point).
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { status: "error" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
