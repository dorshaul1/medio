import { redirect } from "next/navigation";

// Taste moved into Stats as a tab (`/stats?tab=taste`) — see docs/stats.md,
// "Information architecture". This route stays only as a safe redirect
// for anyone with the old URL bookmarked/linked; there is exactly one
// canonical Taste implementation, not two.
export default function LibraryTastePage() {
  redirect("/stats?tab=taste");
}
