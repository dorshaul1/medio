import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Statically typed `<Link>`/`router` hrefs. Enabled now because this
  // phase introduces the app's first real dynamic routes (/movies/[id],
  // /shows/[id]) — see src/features/media/media-route.ts.
  typedRoutes: true,
  images: {
    remotePatterns: [
      // TMDB's image CDN — the only external image host this app serves.
      // Narrowed to the actual image path prefix, not a blanket host
      // allowance. See docs/media-provider.md.
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
};

export default nextConfig;
