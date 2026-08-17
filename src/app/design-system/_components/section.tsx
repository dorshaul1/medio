import type { ReactNode } from "react";

export const SECTIONS = [
  { id: "typography", label: "Typography" },
  { id: "colors", label: "Colors" },
  { id: "primary", label: "Primary — Clay" },
  { id: "surfaces", label: "Surfaces & radius" },
  { id: "actions", label: "Actions" },
  { id: "identity", label: "Identity" },
  { id: "form-controls", label: "Form controls" },
  { id: "selection", label: "Selection" },
  { id: "status", label: "Status" },
  { id: "loading", label: "Loading" },
  { id: "overlays", label: "Overlays" },
] as const;

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: (typeof SECTIONS)[number]["id"];
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 border-t border-border pt-10 first:border-t-0 first:pt-0"
    >
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-lg font-medium">{title}</h2>
        {description ? (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 py-4 first:pt-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
