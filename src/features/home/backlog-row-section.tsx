import { getHomeBacklogPreview } from "@/server/home/backlog";
import { BacklogRow } from "./backlog-row";

// The data-fetching wrapper `home-page.tsx` actually renders — its own
// Suspense boundary and its own failure boundary (degrades to nothing),
// same reasoning as `PersonalizedHomeSections`.
export async function BacklogRowSection() {
  try {
    const items = await getHomeBacklogPreview();
    return <BacklogRow items={items} />;
  } catch {
    return null;
  }
}
