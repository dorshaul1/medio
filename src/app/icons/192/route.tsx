import { ImageResponse } from "next/og";
import { MedioMark } from "@/components/medio-mark";

// A standalone Route Handler (not the `icon.tsx` file convention, which
// only ever produces one size) — the manifest's 192×192 "any"-purpose
// icon (`app/manifest.ts`). See docs/pwa.md, "App icons". Output never
// varies per request, so this renders once at build time rather than
// regenerating the same PNG on every request.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<MedioMark size={192} />, { width: 192, height: 192 });
}
