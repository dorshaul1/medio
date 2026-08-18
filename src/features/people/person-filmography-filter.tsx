import type { Route } from "next";
import { LinkTabs } from "@/components/ui/link-tabs";
import { personHref } from "@/features/media/person-route";
import type { CreditRole } from "@/server/people/types";

const LABELS: Record<CreditRole, string> = {
  directing: "Directing",
  writing: "Writing",
  producing: "Producing",
  acting: "Acting",
};

// Plain navigation via real links (`?credit=`), not a client-side panel
// switch — keeps the filter URL-addressable (see docs/media-provider.md,
// "URL state"). Only rendered by the caller when there's more than one
// section — a single-profession career (most actors have no Directing/
// Writing/Producing credits at all) gets no filter chrome.
export function PersonFilmographyFilter({
  personId,
  roles,
  active,
}: {
  personId: number;
  roles: readonly CreditRole[];
  active: CreditRole | "all";
}) {
  const options: readonly (CreditRole | "all")[] = ["all", ...roles];

  return (
    <LinkTabs
      ariaLabel="Filmography filter"
      active={active}
      // This changes only `?credit=` on the same page — Next's default
      // navigation scroll-to-top makes sense for a real page change, not
      // for staying on Filmography and swapping which section is visible.
      scroll={false}
      items={options.map((option) => ({
        value: option,
        label: option === "all" ? "All" : LABELS[option],
        href: (option === "all"
          ? personHref(personId)
          : `${personHref(personId)}?credit=${option}`) as Route,
      }))}
    />
  );
}
