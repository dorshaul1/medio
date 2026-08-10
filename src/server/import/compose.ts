import "server-only";
import { getExistingUserState } from "./candidates";
import { lookupResolvedIdentity, resolveIdentities } from "./matching";
import { buildImportPlan, type ResolvedRecord } from "./plan";
import type { ImportPlan, ParsedImportRecord } from "./types";

// The one place a parsed record set becomes a real `ImportPlan` — see
// docs/data-portability.md, "Dry run". Ties together identity resolution
// (`matching.ts`, I/O) and the existing-state snapshot (`candidates.ts`,
// I/O) with the pure plan builder (`plan.ts`); owns no persistence of
// its own — nothing is written until a separate, explicit confirm step
// calls `persist.ts` with this same plan.
export async function buildPlanForRecords(
  records: readonly ParsedImportRecord[],
): Promise<ImportPlan> {
  const [resolvedByKey, existing] = await Promise.all([
    resolveIdentities(records.map((record) => record.identity)),
    getExistingUserState(),
  ]);

  const resolvedRecords: ResolvedRecord[] = records.map((record) => ({
    record,
    resolved: lookupResolvedIdentity(resolvedByKey, record.identity),
  }));

  return buildImportPlan(resolvedRecords, existing);
}
