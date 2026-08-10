"use server";

import { revalidatePath } from "next/cache";
import { buildWatchHistoryCsv } from "@/server/export/csv";
import { buildNativeExport } from "@/server/export/native";
import type { NativeExport } from "@/server/export/types";
import type { ImportBatchSummary, RollbackResult } from "@/server/import/batches";
import { listImportBatches, rollbackImportBatch } from "@/server/import/batches";
import { getExistingUserState } from "@/server/import/candidates";
import { buildPlanForRecords } from "@/server/import/compose";
import { lookupResolvedIdentity, resolveIdentities } from "@/server/import/matching";
import { parseGenericCsv } from "@/server/import/parsers/generic-csv";
import { parseLetterboxdFiles } from "@/server/import/parsers/letterboxd";
import { parseNativeExport } from "@/server/import/parsers/native";
import type { PersistResult } from "@/server/import/persist";
import { persistImportPlan } from "@/server/import/persist";
import { buildImportPlan } from "@/server/import/plan";
import type {
  ImportParseError,
  ImportPlan,
  ImportSource,
  ParsedImportRecord,
} from "@/server/import/types";
import type { MediaType } from "@/server/media/types";

// Untrusted-upload limits — see docs/data-portability.md, "Security"/
// "File size". Generous enough for a realistic multi-thousand-title
// history, never unlimited.
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_RECORDS = 50_000;

export type PreviewResult = {
  records: readonly ParsedImportRecord[];
  plan: ImportPlan;
  parseErrors: readonly ImportParseError[];
};

// Step 1–4 of the import flow (choose source → upload → parse → show
// summary) in one round trip — see docs/data-portability.md, "Import
// UX". Never mutates anything: this is the plan/dry-run step, the file
// itself is parsed then discarded (see docs/data-portability.md, "Import
// privacy" — no raw upload is ever persisted).
export async function previewImportAction(formData: FormData): Promise<PreviewResult> {
  const source = formData.get("source");
  if (source !== "medio" && source !== "letterboxd" && source !== "csv") {
    throw new Error("Choose an import source.");
  }

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  const [firstFile] = files;
  if (!firstFile) throw new Error("Choose at least one file.");
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`"${file.name}" is larger than the 20 MB import limit.`);
    }
  }

  let records: readonly ParsedImportRecord[] = [];
  let parseErrors: readonly ImportParseError[] = [];

  if (source === "medio") {
    const text = await firstFile.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("This file isn't valid JSON — it doesn't look like a MEDIO export.");
    }
    const result = parseNativeExport(json);
    records = result.records;
    parseErrors = result.errors;
  } else if (source === "letterboxd") {
    const letterboxdFiles = await Promise.all(
      files.map(async (file) => ({ name: file.name, content: await file.text() })),
    );
    const result = parseLetterboxdFiles(letterboxdFiles);
    records = result.records;
    parseErrors = result.errors;
  } else {
    const text = await firstFile.text();
    const result = parseGenericCsv(text);
    records = result.records;
    parseErrors = result.errors;
  }

  if (records.length > MAX_RECORDS) {
    throw new Error(
      `This file has more than ${MAX_RECORDS.toLocaleString()} rows — split it and import in smaller pieces.`,
    );
  }

  const plan = await buildPlanForRecords(records);
  return { records, plan, parseErrors };
}

export type ImportOverride = { mediaType: MediaType; providerId: number };

// Step 6–7 (confirm → result). Deliberately re-resolves and re-builds the
// plan from scratch against the *current* database state rather than
// trusting the client-held preview plan — a user reviewing hundreds of
// ambiguous matches can take a while, and this keeps duplicate/conflict
// detection correct even if their own state changed in the meantime
// (see docs/data-portability.md, "Determinism"). `overrides` carries the
// user's manual review picks, keyed by the record's index in the same
// `records` array the preview step returned.
export async function confirmImportAction(input: {
  records: readonly ParsedImportRecord[];
  overrides: Record<number, ImportOverride>;
  source: ImportSource;
  sourceFilename: string | null;
}): Promise<PersistResult> {
  const [resolvedByKey, existing] = await Promise.all([
    resolveIdentities(input.records.map((record) => record.identity)),
    getExistingUserState(),
  ]);

  const resolvedRecords = input.records.map((record, index) => {
    const override = input.overrides[index];
    if (override) {
      return {
        record,
        resolved: {
          status: "resolved" as const,
          mediaType: override.mediaType,
          providerId: override.providerId,
          title: "",
          year: null,
          poster: null,
        },
      };
    }
    return { record, resolved: lookupResolvedIdentity(resolvedByKey, record.identity) };
  });

  const plan = buildImportPlan(resolvedRecords, existing);
  const result = await persistImportPlan({
    plan,
    source: input.source,
    sourceFilename: input.sourceFilename,
  });

  // Imported history affects nearly everything (Home, Library, Diary,
  // Stats, Calendar) — same "revalidate the whole layout" precedent
  // `settings-actions.ts` already uses for preference changes.
  revalidatePath("/", "layout");
  return result;
}

export async function listImportBatchesAction(): Promise<readonly ImportBatchSummary[]> {
  return listImportBatches();
}

export async function undoImportBatchAction(batchId: string): Promise<RollbackResult> {
  const result = await rollbackImportBatch(batchId);
  revalidatePath("/", "layout");
  return result;
}

export async function exportNativeAction(includePreferences: boolean): Promise<NativeExport> {
  return buildNativeExport(includePreferences);
}

export async function exportWatchHistoryCsvAction(): Promise<string> {
  return buildWatchHistoryCsv();
}
