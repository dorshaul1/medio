// Parses a MEDIO native JSON export back into normalized import records
// — the highest-fidelity import path (see docs/data-portability.md,
// "MEDIO native re-import"). Pure: no I/O, no DB access, no TMDB calls —
// every record already carries real TMDB identity (`known`, not
// `titleYear`), so this never needs matching at all. Untrusted input
// (an uploaded file) is validated defensively with Zod before anything
// else touches it — see CLAUDE.md, "Security".
import { z } from "zod";
import { NATIVE_EXPORT_SCHEMA_VERSION } from "@/server/export/types";
import { parseExactTimestamp } from "../date";
import type { ImportParseError, ParsedImportRecord, ParseResult } from "../types";

const movieWatchSchema = z.object({
  movieProviderId: z.number().int().positive(),
  title: z.string(),
  year: z.number().int().nullable().optional(),
  watchedAt: z.string(),
});

const episodeWatchSchema = z.object({
  showProviderId: z.number().int().positive(),
  showTitle: z.string(),
  seasonNumber: z.number().int().min(0),
  episodeNumber: z.number().int().positive(),
  episodeProviderId: z.number().int().positive(),
  watchedAt: z.string(),
});

const planningItemSchema = z.object({
  mediaType: z.enum(["movie", "show"]),
  mediaProviderId: z.number().int().positive(),
  title: z.string(),
  year: z.number().int().nullable().optional(),
  intent: z.enum(["watchlist", "backlog"]),
});

const showTrackingStateSchema = z.object({
  showProviderId: z.number().int().positive(),
  title: z.string(),
  status: z.enum(["watching", "on_hold", "dropped"]),
});

const commentSchema = z.object({
  mediaType: z.enum(["movie", "show"]),
  mediaProviderId: z.number().int().positive(),
  title: z.string(),
  year: z.number().int().nullable().optional(),
  content: z.string().min(1),
});

const nativeExportSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.object({
    movieWatchEvents: z.array(movieWatchSchema).default([]),
    episodeWatchEvents: z.array(episodeWatchSchema).default([]),
    planningItems: z.array(planningItemSchema).default([]),
    showTrackingState: z.array(showTrackingStateSchema).default([]),
    comments: z.array(commentSchema).default([]),
  }),
});

export function parseNativeExport(raw: unknown): ParseResult {
  const parsed = nativeExportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      records: [],
      errors: [
        {
          row: 0,
          reason:
            "This file isn't a valid MEDIO export — its structure doesn't match a recognized export.",
        },
      ],
    };
  }

  // Only version 1 exists so far. A future version 2 would branch here
  // (e.g. a versioned `switch` over `schemaVersion`) rather than this
  // function growing conditionals for a version that doesn't exist yet
  // — see CLAUDE.md, "Avoid speculative abstractions".
  if (parsed.data.schemaVersion > NATIVE_EXPORT_SCHEMA_VERSION) {
    return {
      records: [],
      errors: [
        {
          row: 0,
          reason: `This file was exported by a newer version of MEDIO (schema v${parsed.data.schemaVersion}) than this app currently supports (v${NATIVE_EXPORT_SCHEMA_VERSION}).`,
        },
      ],
    };
  }

  const { data } = parsed.data;
  const records: ParsedImportRecord[] = [];
  const errors: ImportParseError[] = [];
  let row = 0;

  for (const item of data.movieWatchEvents) {
    row++;
    const parsedDate = parseExactTimestamp(item.watchedAt);
    if (!parsedDate) {
      errors.push({ row, reason: `Invalid watch timestamp for "${item.title}".` });
      continue;
    }
    records.push({
      kind: "movieWatch",
      identity: { kind: "known", mediaType: "movie", providerId: item.movieProviderId },
      watchedAt: parsedDate.date,
      datePrecision: parsedDate.precision,
    });
  }

  for (const item of data.episodeWatchEvents) {
    row++;
    const parsedDate = parseExactTimestamp(item.watchedAt);
    if (!parsedDate) {
      errors.push({
        row,
        reason: `Invalid watch timestamp for "${item.showTitle}" S${item.seasonNumber} E${item.episodeNumber}.`,
      });
      continue;
    }
    records.push({
      kind: "episodeWatch",
      identity: { kind: "known", mediaType: "show", providerId: item.showProviderId },
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
      episodeProviderId: item.episodeProviderId,
      watchedAt: parsedDate.date,
      datePrecision: parsedDate.precision,
    });
  }

  for (const item of data.planningItems) {
    row++;
    records.push({
      kind: "planningItem",
      identity: { kind: "known", mediaType: item.mediaType, providerId: item.mediaProviderId },
      intent: item.intent,
    });
  }

  for (const item of data.showTrackingState) {
    row++;
    records.push({
      kind: "showTrackingState",
      identity: { kind: "known", mediaType: "show", providerId: item.showProviderId },
      status: item.status,
    });
  }

  for (const item of data.comments) {
    row++;
    records.push({
      kind: "comment",
      identity: { kind: "known", mediaType: item.mediaType, providerId: item.mediaProviderId },
      content: item.content,
    });
  }

  return { records, errors };
}
