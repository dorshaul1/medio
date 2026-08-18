import { LinkTabs } from "@/components/ui/link-tabs";
import type { DiscoverMediaType } from "@/features/discover/discover-params";

// Plain navigation (two real URLs, real content difference), not a
// client-side panel switch.
const OPTIONS: readonly {
  value: DiscoverMediaType;
  label: string;
  href: "/discover" | "/discover?type=shows";
}[] = [
  { value: "movies", label: "Movies", href: "/discover" },
  { value: "shows", label: "Shows", href: "/discover?type=shows" },
];

export function MediaTypeToggle({ active }: { active: DiscoverMediaType }) {
  return <LinkTabs ariaLabel="Media type" active={active} items={OPTIONS} />;
}
