"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GENERIC_CSV_TEMPLATE } from "@/server/import/parsers/generic-csv";
import type { MatchCandidate, ParsedImportRecord } from "@/server/import/types";
import {
  confirmImportAction,
  type ImportOverride,
  type PreviewResult,
  previewImportAction,
} from "./data-actions";

type Step = "source" | "upload" | "preview" | "result";
type Source = "medio" | "letterboxd" | "csv";

const SOURCE_OPTIONS: readonly { value: Source; label: string; description: string }[] = [
  {
    value: "medio",
    label: "MEDIO export",
    description: "Restore a previous MEDIO backup — the highest-fidelity option.",
  },
  {
    value: "letterboxd",
    label: "Letterboxd",
    description:
      "Your diary, ratings, and watchlist exports (Settings → Data → Export on Letterboxd).",
  },
  {
    value: "csv",
    label: "Generic CSV",
    description: "A small, documented spreadsheet format — a migration path from anywhere else.",
  },
];

function recordDisplayLabel(record: ParsedImportRecord): string {
  const identity = record.identity;
  const title = identity.kind === "titleYear" ? identity.title : "";
  const year = identity.kind === "titleYear" ? identity.year : null;
  const withYear = year ? `${title} (${year})` : title;
  if (record.kind === "episodeWatch")
    return `${withYear} — S${record.seasonNumber} E${record.episodeNumber}`;
  return withYear;
}

function groupKeyFor(record: ParsedImportRecord): string {
  const identity = record.identity;
  if (identity.kind === "known") return `known:${identity.mediaType}:${identity.providerId}`;
  return `title:${identity.mediaType}:${identity.title.trim().toLowerCase()}:${identity.year ?? ""}`;
}

type ReviewGroup = {
  key: string;
  label: string;
  recordIndexes: readonly number[];
  candidates: readonly MatchCandidate[];
};

// Groups every `needsReview` entry by its underlying title/year query —
// a Letterboxd diary with 40 rows for the same ambiguous title shows one
// compact review row, not 40 near-identical ones (see
// docs/data-portability.md, "Manual review"). The user's pick applies to
// every record that shared the same query.
function buildReviewGroups(preview: PreviewResult): readonly ReviewGroup[] {
  const groups = new Map<
    string,
    { label: string; recordIndexes: number[]; candidates: readonly MatchCandidate[] }
  >();

  preview.plan.entries.forEach((entry, index) => {
    if (entry.status !== "needsReview") return;
    const key = groupKeyFor(entry.record);
    const existing = groups.get(key);
    if (existing) {
      existing.recordIndexes.push(index);
      return;
    }
    groups.set(key, {
      label: recordDisplayLabel(entry.record),
      recordIndexes: [index],
      candidates: entry.resolved.status === "needsReview" ? entry.resolved.candidates : [],
    });
  });

  return [...groups.entries()].map(([key, value]) => ({ key, ...value }));
}

function downloadCsvTemplate(): void {
  const blob = new Blob([GENERIC_CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "medio-import-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// The guided import flow — see docs/data-portability.md, "Import UX":
// choose a source, upload, preview (a real dry run — nothing is written
// yet), resolve anything ambiguous, confirm, see the result. Local
// `useState` step machine, not a route per step — this never needs to
// be bookmarked or shared, and a plain state machine keeps the whole
// flow on one settings page rather than navigating away from it.
export function ImportFlow() {
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<Source | null>(null);
  const [fileNames, setFileNames] = useState<readonly string[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [overrides, setOverrides] = useState<Record<number, ImportOverride>>({});
  const [skippedGroups, setSkippedGroups] = useState<ReadonlySet<string>>(new Set());
  const [result, setResult] = useState<Awaited<ReturnType<typeof confirmImportAction>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reviewGroups = useMemo(() => (preview ? buildReviewGroups(preview) : []), [preview]);

  function reset() {
    setStep("source");
    setSource(null);
    setFileNames([]);
    setPreview(null);
    setOverrides({});
    setSkippedGroups(new Set());
    setResult(null);
    setError(null);
  }

  function chooseSource(next: Source) {
    setSource(next);
    setStep("upload");
    setError(null);
  }

  function runPreview() {
    const files = fileInputRef.current?.files;
    if (!source || !files || files.length === 0) {
      setError("Choose at least one file.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("source", source);
    for (const file of files) formData.append("files", file);
    setFileNames([...files].map((file) => file.name));

    startTransition(async () => {
      try {
        const previewResult = await previewImportAction(formData);
        setPreview(previewResult);
        setStep("preview");
      } catch (previewError) {
        setError(previewError instanceof Error ? previewError.message : "Couldn't read that file.");
      }
    });
  }

  function chooseCandidate(group: ReviewGroup, candidate: MatchCandidate) {
    setOverrides((current) => {
      const next = { ...current };
      for (const index of group.recordIndexes) {
        next[index] = { mediaType: candidate.mediaType, providerId: candidate.providerId };
      }
      return next;
    });
    setSkippedGroups((current) => {
      const next = new Set(current);
      next.delete(group.key);
      return next;
    });
  }

  function skipAllUnmatched() {
    if (!preview) return;
    setSkippedGroups(new Set(reviewGroups.map((group) => group.key)));
  }

  function confirmImport() {
    if (!preview || !source) return;
    setError(null);
    startTransition(async () => {
      try {
        const persistResult = await confirmImportAction({
          records: preview.records,
          overrides,
          source,
          sourceFilename: fileNames[0] ?? null,
        });
        setResult(persistResult);
        setStep("result");
      } catch {
        setError("Something went wrong while importing. Nothing was changed.");
      }
    });
  }

  if (step === "source") {
    return (
      <div className="flex flex-col gap-2">
        {SOURCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => chooseSource(option.value)}
            className="flex flex-col gap-0.5 rounded-md border border-border px-4 py-3 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="text-sm font-medium text-foreground">{option.label}</span>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </button>
        ))}
      </div>
    );
  }

  if (step === "upload" && source) {
    const multiple = source === "letterboxd";
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="import-file-input" className="text-sm font-medium text-foreground">
            {multiple ? "Choose your Letterboxd export files" : "Choose a file"}
          </label>
          <input
            ref={fileInputRef}
            id="import-file-input"
            type="file"
            accept={source === "medio" ? ".json" : ".csv"}
            multiple={multiple}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
          />
          {source === "csv" ? (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={downloadCsvTemplate}
            >
              Download CSV template
            </Button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={reset}>
            Back
          </Button>
          <Button onClick={runPreview} loading={isPending}>
            Preview import
          </Button>
        </div>
      </div>
    );
  }

  if (step === "preview" && preview) {
    const { summary } = preview.plan;
    const readyCount = summary.ready;

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">{summary.total.toLocaleString()} items found</Badge>
          <Badge variant="positive">{summary.ready.toLocaleString()} ready</Badge>
          {summary.needsReview > 0 ? (
            <Badge variant="warning">{summary.needsReview.toLocaleString()} need review</Badge>
          ) : null}
          {summary.notFound > 0 ? (
            <Badge variant="neutral">{summary.notFound.toLocaleString()} not found</Badge>
          ) : null}
          {summary.duplicates > 0 ? (
            <Badge variant="neutral">{summary.duplicates.toLocaleString()} already have this</Badge>
          ) : null}
          {summary.conflicts > 0 ? (
            <Badge variant="neutral">
              {summary.conflicts.toLocaleString()} kept your existing choice
            </Badge>
          ) : null}
          {summary.lookupFailed > 0 ? (
            <Badge variant="negative">{summary.lookupFailed.toLocaleString()} lookup failed</Badge>
          ) : null}
        </div>

        {preview.parseErrors.length > 0 ? (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              {preview.parseErrors.length} row{preview.parseErrors.length === 1 ? "" : "s"} couldn't
              be read
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {preview.parseErrors.slice(0, 20).map((parseError) => (
                <li key={`${parseError.row}-${parseError.reason}`}>{parseError.reason}</li>
              ))}
            </ul>
          </details>
        ) : null}

        {reviewGroups.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Needs review</h3>
              <Button variant="ghost" size="sm" onClick={skipAllUnmatched}>
                Skip all unmatched
              </Button>
            </div>
            <ul className="flex flex-col gap-3">
              {reviewGroups.map((group) => (
                <li
                  key={group.key}
                  className="flex flex-col gap-2 rounded-md border border-border p-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    Imported: {group.label}
                    {group.recordIndexes.length > 1
                      ? ` (${group.recordIndexes.length} entries)`
                      : ""}
                  </p>
                  {group.candidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No possible matches found.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-muted-foreground">Possible matches:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.candidates.map((candidate) => {
                          const isChosen = group.recordIndexes.every(
                            (index) =>
                              overrides[index]?.providerId === candidate.providerId &&
                              overrides[index]?.mediaType === candidate.mediaType,
                          );
                          return (
                            <button
                              key={`${candidate.mediaType}:${candidate.providerId}`}
                              type="button"
                              onClick={() => chooseCandidate(group, candidate)}
                              aria-pressed={isChosen}
                              className={cn(
                                "rounded-md border px-3 py-1.5 text-left text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                                isChosen
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {candidate.title}
                              {candidate.year ? ` (${candidate.year})` : ""}
                              {candidate.mediaType === "show" ? " · TV" : " · Movie"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {skippedGroups.has(group.key) ? (
                    <p className="text-xs text-muted-foreground">Will be skipped.</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={reset}>
            Cancel
          </Button>
          <Button
            onClick={confirmImport}
            loading={isPending}
            disabled={readyCount === 0 && Object.keys(overrides).length === 0}
          >
            Confirm import
          </Button>
        </div>
      </div>
    );
  }

  if (step === "result" && result) {
    const createdTotal = Object.values(result.created).reduce((sum, count) => sum + count, 0);
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">
          Imported {createdTotal.toLocaleString()} record{createdTotal === 1 ? "" : "s"}.
        </p>
        <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          {result.created.movieWatch > 0 ? (
            <li>{result.created.movieWatch} movie watch events</li>
          ) : null}
          {result.created.episodeWatch > 0 ? (
            <li>{result.created.episodeWatch} episode watch events</li>
          ) : null}
          {result.created.planningItem > 0 ? (
            <li>{result.created.planningItem} Watchlist/Backlog items</li>
          ) : null}
          {result.created.showTrackingState > 0 ? (
            <li>{result.created.showTrackingState} show tracking states</li>
          ) : null}
          {result.created.rating > 0 ? <li>{result.created.rating} ratings</li> : null}
          {result.created.note > 0 ? <li>{result.created.note} notes</li> : null}
        </ul>
        {result.failed.length > 0 ? (
          <p className="text-xs text-destructive">
            {result.failed.length} item{result.failed.length === 1 ? "" : "s"} failed to import.
          </p>
        ) : null}
        <Button variant="outline" className="self-start" onClick={reset}>
          Import something else
        </Button>
      </div>
    );
  }

  return null;
}
