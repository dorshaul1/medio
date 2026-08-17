"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { exportNativeAction, exportWatchHistoryCsvAction } from "./data-actions";

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// An unambiguous, machine-readable date in every export filename — see
// docs/data-portability.md, "Export file naming"/"Export dates". Local
// calendar date (not UTC) since this only ever runs client-side, right
// at the moment of a real download click.
function todayFileDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Settings → Data's Export section — see docs/data-portability.md,
// "Export UX". Two plain actions, not a backup dashboard: a complete
// JSON backup, and a readable CSV of watch history alone. Generated on
// the server and handed back directly to this one request — never sent
// anywhere else, never logged (see docs/data-portability.md, "Export
// privacy").
export function DataExportSection() {
  const [includePreferences, setIncludePreferences] = useState(false);
  const [isExportingJson, startJsonExport] = useTransition();
  const [isExportingCsv, startCsvExport] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function exportJson() {
    setError(null);
    startJsonExport(async () => {
      try {
        const result = await exportNativeAction(includePreferences);
        downloadTextFile(
          JSON.stringify(result, null, 2),
          `medio-export-${todayFileDate()}.json`,
          "application/json",
        );
      } catch {
        setError("Couldn't build your export. Try again.");
      }
    });
  }

  function exportCsv() {
    setError(null);
    startCsvExport(async () => {
      try {
        const csv = await exportWatchHistoryCsvAction();
        downloadTextFile(csv, `medio-watch-history-${todayFileDate()}.csv`, "text/csv");
      } catch {
        setError("Couldn't build your export. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-prose text-sm text-muted-foreground">
        Exports can include private comments and your detailed viewing history — keep the file
        somewhere only you can access. This data is never sent anywhere but your own download.
      </p>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={exportJson} loading={isExportingJson}>
            Export complete data
          </Button>
          {/* A Radix Switch is a `role="switch"` button, not a native
              input — its accessible name comes from `aria-label` below,
              not a wrapping `<label for>` (which only associates with
              real form controls). */}
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={includePreferences}
              onCheckedChange={(checked) => setIncludePreferences(checked === true)}
              aria-label="Include preferences in the export"
            />
            Include preferences
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          A complete JSON backup — watch history, comments, and your Watchlist/Backlog.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          onClick={exportCsv}
          loading={isExportingCsv}
          className="self-start"
        >
          Export watch history (CSV)
        </Button>
        <p className="text-xs text-muted-foreground">
          A readable spreadsheet of everything you've watched, for use outside MEDIO.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
