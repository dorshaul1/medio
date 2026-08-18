import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
        {description ? (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {/* Below the title on mobile (a title + a wide action row rarely
          both fit on one line without clipping/overflowing) — back to a
          same-line trailing action from `sm:` up. */}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
