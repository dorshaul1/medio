import { PersonResultRow } from "@/features/discover/person-result-row";
import { SearchResultRow } from "@/features/discover/search-result-row";
import type { PlanningIntent } from "@/server/planning/types";
import type { SearchResult } from "@/server/search/types";

// One coherent result row family for Unified Search's single ranked list
// — a Movie/Show and a Person are genuinely different compositions
// (poster + Save vs. portrait + profession), so this dispatches to the
// right shell rather than forcing one prop-heavy universal row (see
// CLAUDE.md, "Do not create a universal media-card mega-component").
// Callers render one flat list of these, in ranked order — never
// re-grouped by type.
export function UnifiedSearchResultRow({
  result,
  defaultSaveIntent,
  onNavigate,
}: {
  result: SearchResult;
  defaultSaveIntent: PlanningIntent;
  onNavigate?: () => void;
}) {
  if (result.kind === "person") {
    return <PersonResultRow person={result.person} {...(onNavigate ? { onNavigate } : {})} />;
  }

  return (
    <SearchResultRow
      media={result.media}
      personalState={result.personalState}
      defaultSaveIntent={defaultSaveIntent}
      {...(onNavigate ? { onNavigate } : {})}
    />
  );
}
