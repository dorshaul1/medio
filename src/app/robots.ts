import type { MetadataRoute } from "next";

// MEDIO is a personal, authenticated tracking app, not a public content
// site — there's nothing here worth indexing, and most of it is private
// per-user data behind a session anyway. Deliberately disallow all
// crawling rather than leaving robots behavior undefined.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
