import type { ReactNode } from "react";

// The one row shape every individual setting uses — an open layout
// (title + comment beside/above its control), never a bordered card per
// setting (see docs/settings.md, "Layout"). The comment is permanently
// visible, secondary text — never a tooltip or an accordion, since the
// user needs it to understand the setting at all.
export function SettingRow({
  title,
  comment,
  htmlFor,
  children,
}: {
  title: string;
  comment: string;
  // Associates the comment with its control via `aria-describedby` when
  // the control is a single labelable element (see docs/settings.md,
  // "Accessibility") — visual choice controls carry their own
  // description instead (their group already has a real accessible
  // name), so this stays optional.
  htmlFor?: string;
  children: ReactNode;
}) {
  const commentId = htmlFor ? `${htmlFor}-comment` : undefined;

  return (
    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p id={commentId} className="text-sm text-muted-foreground">
          {comment}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
