import type { Metadata } from "next";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PickExperience } from "@/features/pick/pick-experience";
import { parseDecisionContextParams } from "@/features/pick/pick-params";
import { getPickRecommendations } from "@/server/pick/compose";
import { getCurrentUserPreferences } from "@/server/preferences/queries";

export const metadata: Metadata = {
  title: "What should I watch?",
};

// Reached from Home's "Pick for me" entry point (see
// features/home/pick-entry-point.tsx) — deliberately not a primary nav
// destination (see docs/recommendations.md). `?format=`/`?time=` seed the
// initial Format/Time context (see features/pick/pick-params.ts, "URL
// state") — absent or invalid params just mean "no preference", never an
// error. `PickExperience` re-runs the engine client-side, and keeps the
// URL in sync, as the user adjusts either control further. A fresh
// random variety seed is generated per request — see
// docs/recommendations.md, "Controlled variety" — never persisted or
// shared-cached, same as the recommendation result itself.
export default async function PickPage({ searchParams }: PageProps<"/pick">) {
  const params = await searchParams;
  const initialContext = parseDecisionContextParams(params);
  const initialVarietySeed = Math.floor(Math.random() * 1_000_000);

  const [result, preferences] = await Promise.all([
    getPickRecommendations(initialContext, undefined, initialVarietySeed),
    getCurrentUserPreferences(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="What should I watch?"
        description="A short list, curated from what you're already watching, what you've saved, and your taste — not another feed to browse."
      />
      <PickExperience
        initialResult={result}
        initialContext={initialContext}
        initialVarietySeed={initialVarietySeed}
        defaultSaveIntent={preferences.defaultSaveIntent}
      />
    </PageContainer>
  );
}
