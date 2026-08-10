import { ImageResponse } from "next/og";

// A generated favicon/app icon — no static asset existed before. Colors
// are a plain hex approximation of the product's real `--primary` (clay)
// token (see src/app/globals.css) since Satori (the renderer behind
// `ImageResponse`) doesn't support oklch(); this file never renders as
// product UI, so it's exempt from the semantic-token rule that governs
// actual components (see CLAUDE.md, "Visual system").
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#8b5e45",
        borderRadius: 6,
        color: "#f5efe9",
        fontSize: 20,
        fontWeight: 600,
        fontFamily: "sans-serif",
      }}
    >
      M
    </div>,
    { ...size },
  );
}
