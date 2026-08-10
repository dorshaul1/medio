import { Clapperboard, Tv } from "lucide-react";
import { DemoPoster } from "@/features/landing/demo-poster";

const RECENT = [
  { id: "a", tone: "blue" as const, icon: Tv },
  { id: "b", tone: "peach" as const, icon: Clapperboard },
  { id: "c", tone: "sage" as const, icon: Tv },
  { id: "d", tone: "lavender" as const, icon: Clapperboard },
] as const;

const RHYTHM = [
  { day: "Mon", value: 2 },
  { day: "Tue", value: 4 },
  { day: "Wed", value: 1 },
  { day: "Thu", value: 5 },
  { day: "Fri", value: 3 },
  { day: "Sat", value: 6 },
  { day: "Sun", value: 2 },
] as const;

// "Your viewing history becomes yours" — Diary, Stats, and Taste told as
// one accumulating story rather than three separate tools (see
// CLAUDE.md, "Landing"): recent activity at top, what it adds up to
// underneath. Editorial, not a BI dashboard — two plain numbers, one
// label, and a small hand-built rhythm sparkline, no KPI cards, no chart
// library.
export function HistoryIllustration() {
  const max = Math.max(...RHYTHM.map((day) => day.value));

  return (
    <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Recently watched
      </p>
      <div className="mt-2.5 flex gap-2">
        {RECENT.map((item) => (
          <DemoPoster key={item.id} tone={item.tone} icon={item.icon} size="sm" />
        ))}
      </div>

      <div className="mt-5 flex items-end gap-6 border-t border-border pt-4">
        <div>
          <p className="text-2xl font-medium text-foreground">12</p>
          <p className="text-xs text-muted-foreground">Movies</p>
        </div>
        <div>
          <p className="text-2xl font-medium text-foreground">36</p>
          <p className="text-xs text-muted-foreground">Episodes</p>
        </div>
        <div>
          <p className="text-2xl font-medium text-primary">Drama</p>
          <p className="text-xs text-muted-foreground">Top genre</p>
        </div>
      </div>

      <div className="mt-4 flex h-8 items-end gap-1.5">
        {RHYTHM.map((day) => (
          <div
            key={day.day}
            className="flex-1 rounded-sm bg-primary/70 first:bg-primary last:bg-primary"
            style={{ height: `${(day.value / max) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}
