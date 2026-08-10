import { Separator } from "@/components/ui/separator";
import { listImportBatches } from "@/server/import/batches";
import { DataExportSection } from "./data-export-section";
import { DataImportHistory } from "./data-import-history";
import { ImportFlow } from "./import-flow";
import { SettingsCategoryHeader } from "./settings-category-header";

// Settings' Data category — a trust and onboarding feature, not a backup
// dashboard (see docs/data-portability.md). Import, Export, and recent
// import history/undo, in that order: what a user can bring in first,
// what they can take out, then an audit trail of what's already
// happened. Deliberately no giant table, no dropzone billboard, no
// multi-page wizard — see docs/data-portability.md, "UI design".
export async function DataSettings() {
  const batches = await listImportBatches();

  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="Data"
        description="Your viewing data belongs to you. Import your history from another app, or export a copy at any time."
      />
      <Separator />
      <div className="flex flex-col gap-8 py-5">
        <section aria-labelledby="data-import-heading" className="flex flex-col gap-4">
          <h2 id="data-import-heading" className="text-sm font-medium text-foreground">
            Import
          </h2>
          <ImportFlow />
        </section>

        <Separator />

        <section aria-labelledby="data-export-heading" className="flex flex-col gap-4">
          <h2 id="data-export-heading" className="text-sm font-medium text-foreground">
            Export
          </h2>
          <DataExportSection />
        </section>

        {batches.length > 0 ? (
          <>
            <Separator />
            <section aria-labelledby="data-history-heading" className="flex flex-col gap-4">
              <h2 id="data-history-heading" className="text-sm font-medium text-foreground">
                Recent imports
              </h2>
              <DataImportHistory initialBatches={batches} />
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
