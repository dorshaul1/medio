// A brand-new (or filtered-to-nothing) Calendar — restrained, not a
// marketing-style icon-in-a-circle (see docs/calendar.md, "Empty
// states"). `heading`/`description` differ between genuinely nothing
// tracked/planned yet and a filter simply matching nothing right now.
export function CalendarEmptyState({
  heading,
  description,
}: {
  heading: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 py-10">
      <p className="text-sm font-medium text-foreground">{heading}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
