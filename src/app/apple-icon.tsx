import { ImageResponse } from "next/og";
import { MedioMark } from "@/components/medio-mark";

// iOS's Home Screen icon — Next's `apple-icon.tsx` file convention
// (auto-injects the `<link rel="apple-touch-icon">` tag). iOS applies
// its own rounded-square mask on top, so this uses the same "any"-
// purpose (no extra safe-zone inset) mark as the standard manifest
// icons — iOS's own corner-rounding is gentler than a full maskable
// crop. See docs/pwa.md, "App icons".
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<MedioMark size={180} />, { ...size });
}
