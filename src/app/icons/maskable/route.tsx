import { ImageResponse } from "next/og";
import { MedioMark } from "@/components/medio-mark";

// The manifest's maskable icon (`app/manifest.ts`) — Android/other
// platforms crop this to an arbitrary shape (circle, squircle, rounded
// square), so the mark keeps a real safe-zone margin rather than filling
// the whole tile. See docs/pwa.md, "App icons". Output never varies per
// request.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(<MedioMark size={512} inset={0.1} />, { width: 512, height: 512 });
}
