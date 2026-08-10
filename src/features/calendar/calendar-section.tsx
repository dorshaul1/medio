import { CalendarEventGroup } from "@/features/calendar/calendar-event-group";
import { releaseEventGroupKey } from "@/server/calendar/group";
import type { ReleaseEventGroup } from "@/server/calendar/types";
import type { SpoilerProtectionValue } from "@/server/db/schema/preferences";

// One labeled agenda section (Recently released/Today/Tomorrow/This
// week/Later) — omits itself entirely when empty, so the agenda never
// shows a run of empty headings (see docs/calendar.md, "No empty
// sections").
export function CalendarSection({
  id,
  label,
  groups,
  now,
  useLocalTimezone,
  spoilerProtection,
}: {
  id: string;
  label: string;
  groups: readonly ReleaseEventGroup[];
  now: Date;
  useLocalTimezone: boolean;
  spoilerProtection: SpoilerProtectionValue;
}) {
  if (groups.length === 0) return null;

  return (
    <section aria-labelledby={`calendar-section-${id}`}>
      <h2
        id={`calendar-section-${id}`}
        className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {groups.map((group) => (
          <CalendarEventGroup
            key={releaseEventGroupKey(group)}
            group={group}
            now={now}
            useLocalTimezone={useLocalTimezone}
            spoilerProtection={spoilerProtection}
          />
        ))}
      </ul>
    </section>
  );
}
