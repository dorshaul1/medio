"use client";

import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useState, useTransition } from "react";
import { refreshPickAction } from "@/features/pick/pick-actions";
import { AlternativePickCard, PrimaryPickCard } from "@/features/pick/pick-card";
import { decisionContextToSearch } from "@/features/pick/pick-params";
import { cn } from "@/lib/utils";
import {
  TIME_BUDGET_HOUR_MINUTES,
  TIME_BUDGET_MOVIE_NIGHT_MINUTES,
  TIME_BUDGET_QUICK_MINUTES,
} from "@/server/pick/constants";
import type { DecisionContext, PickResult } from "@/server/pick/types";
import type { PlanningIntent } from "@/server/planning/types";

const FORMAT_OPTIONS: readonly { value: DecisionContext["mediaType"]; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "movie", label: "Movie" },
  { value: "show", label: "Show" },
];

// Named presets, not a raw minute slider — see docs/recommendations.md,
// "Time presets". Thresholds live in server/pick/constants.ts; the
// labels here stay human ("Quick", "About an hour") rather than exposing
// the exact minute cutoffs as the primary language.
const TIME_OPTIONS: readonly {
  key: string;
  value: DecisionContext["timeBudgetMinutes"];
  label: string;
}[] = [
  { key: "any", value: null, label: "Any length" },
  { key: "quick", value: TIME_BUDGET_QUICK_MINUTES, label: "Quick" },
  { key: "hour", value: TIME_BUDGET_HOUR_MINUTES, label: "About an hour" },
  { key: "movie-night", value: TIME_BUDGET_MOVIE_NIGHT_MINUTES, label: "Movie night" },
];

// Looks up the option's own key rather than deriving one from the raw
// minute value — the two used to coincide when keys were literally the
// minute number ("45"/"120"), but TIME_OPTIONS now uses semantic keys
// ("quick"/"hour"/"movie-night"), so this must go through the option
// list itself to stay correct.
function timeKey(value: DecisionContext["timeBudgetMinutes"]): string {
  return TIME_OPTIONS.find((option) => option.value === value)?.key ?? "any";
}

function chipClass(active: boolean): string {
  return cn(
    "rounded-sm px-3 py-1.5 text-sm font-medium outline-none transition-colors select-none",
    "focus-visible:ring-3 focus-visible:ring-ring/50",
    active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
  );
}

// Pick's one client boundary — everything above it (the initial result,
// the page chrome) stays server-rendered. Format/Time and the session
// "Not now" exclusion set are pure client state, never persisted (see
// docs/recommendations.md, "Session-only context") — every change here
// re-runs the decision engine via `refreshPickAction` rather than
// filtering the existing result client-side, since a changed context can
// surface entirely different candidates the client never fetched.
export function PickExperience({
  initialResult,
  initialContext,
  initialVarietySeed = 0,
  defaultSaveIntent,
}: {
  initialResult: PickResult;
  initialContext: DecisionContext;
  // Generated once per page request (see app/(app)/pick/page.tsx) and
  // kept for the rest of this session — controlled rotation happens
  // across separate visits, never mid-session on every click (see
  // docs/recommendations.md, "Controlled variety"). Defaults to 0 (fully
  // deterministic) for callers/tests that don't care about it.
  initialVarietySeed?: number;
  defaultSaveIntent: PlanningIntent;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [context, setContext] = useState(initialContext);
  const [excludedIds, setExcludedIds] = useState<readonly number[]>([]);
  const [result, setResult] = useState(initialResult);
  const [isPending, startTransition] = useTransition();
  const varietySeed = initialVarietySeed;

  function refresh(
    nextContext: DecisionContext,
    nextExcludedIds: readonly number[],
    syncUrl = false,
  ) {
    setContext(nextContext);
    setExcludedIds(nextExcludedIds);
    if (syncUrl) {
      router.replace(`${pathname}${decisionContextToSearch(nextContext)}` as Route, {
        scroll: false,
      });
    }
    startTransition(async () => {
      setResult(await refreshPickAction(nextContext, nextExcludedIds, varietySeed));
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <RadioGroupPrimitive.Root
          value={context.mediaType}
          onValueChange={(value) =>
            refresh(
              { ...context, mediaType: value as DecisionContext["mediaType"] },
              excludedIds,
              true,
            )
          }
          aria-label="Format"
          className="inline-flex rounded-md border border-border p-0.5"
        >
          {FORMAT_OPTIONS.map((option) => (
            <RadioGroupPrimitive.Item
              key={option.value}
              value={option.value}
              className={chipClass(context.mediaType === option.value)}
            >
              {option.label}
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>

        <RadioGroupPrimitive.Root
          value={timeKey(context.timeBudgetMinutes)}
          onValueChange={(value) => {
            const selected = TIME_OPTIONS.find((option) => option.key === value);
            refresh(
              { ...context, timeBudgetMinutes: selected ? selected.value : null },
              excludedIds,
              true,
            );
          }}
          aria-label="Time available"
          className="inline-flex rounded-md border border-border p-0.5"
        >
          {TIME_OPTIONS.map((option) => (
            <RadioGroupPrimitive.Item
              key={option.key}
              value={option.key}
              className={chipClass(timeKey(context.timeBudgetMinutes) === option.key)}
            >
              {option.label}
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
      </div>

      {result.relaxedTimeConstraint ? (
        <p className="text-sm text-muted-foreground" role="status">
          Nothing quite fit that time, so we widened the search.
        </p>
      ) : null}

      <div className={cn("flex flex-col gap-8 transition-opacity", isPending && "opacity-60")}>
        {result.primary ? (
          <PrimaryPickCard
            key={`${result.primary.candidate.kind}-${result.primary.candidate.mediaProviderId}`}
            recommendation={result.primary}
            defaultSaveIntent={defaultSaveIntent}
            isBusy={isPending}
            onTracked={() => refresh(context, excludedIds)}
            onAnotherPick={() =>
              result.primary &&
              refresh(context, [...excludedIds, result.primary.candidate.mediaProviderId])
            }
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing matches right now — try widening the format or time.
            </p>
          </div>
        )}

        {result.alternatives.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-muted-foreground">More options</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.alternatives.map((alternative) => (
                <AlternativePickCard
                  key={`${alternative.candidate.kind}-${alternative.candidate.mediaProviderId}`}
                  recommendation={alternative}
                  defaultSaveIntent={defaultSaveIntent}
                  onTracked={() => refresh(context, excludedIds)}
                  onNotNow={() =>
                    refresh(context, [...excludedIds, alternative.candidate.mediaProviderId])
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
