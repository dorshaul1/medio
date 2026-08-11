import { ImageResponse } from "next/og";
import { MedioMark } from "@/components/medio-mark";

// The browser-tab favicon — Next's `icon.tsx` file convention. Shares
// the same mark every other app-icon size uses (`components/medio-mark.tsx`,
// `app/apple-icon.tsx`, `app/icons/*/route.tsx`) so the brand reads
// identically at every size, from a 16px tab to a 512px Home Screen
// tile. See docs/pwa.md, "App icons".
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<MedioMark size={32} />, { ...size });
}
