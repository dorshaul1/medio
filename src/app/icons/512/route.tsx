import { ImageResponse } from "next/og";
import { MedioMark } from "@/components/medio-mark";

// The manifest's 512×512 "any"-purpose icon (`app/manifest.ts`) — see
// docs/pwa.md, "App icons". Output never varies per request.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<MedioMark size={512} />, { width: 512, height: 512 });
}
