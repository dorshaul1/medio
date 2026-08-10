import Link from "next/link";
import { personHref } from "@/features/media/person-route";

// A restrained inline text link — for a person's name sitting inside a
// sentence next to plain prose (a movie's "Directed by", a show's
// "Created by"), not a tappable card. Deliberately not Clay-colored: see
// docs/design-system.md, "Content brings the color" — a bright
// brand-colored name mid-sentence would read as a generic web article,
// not this product. Discoverable through the underline strengthening on
// hover/focus instead of a color change.
export function PersonLink({ id, name }: { id: number; name: string }) {
  return (
    <Link
      href={personHref(id)}
      className="rounded-sm text-foreground underline decoration-muted-foreground/40 underline-offset-2 outline-none transition-colors hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {name}
    </Link>
  );
}
