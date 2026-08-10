import { SECTIONS } from "@/app/design-system/_components/section";

export function TableOfContents() {
  return (
    <nav aria-label="Sections" className="sticky top-8 hidden w-40 shrink-0 lg:block">
      <ul className="flex flex-col gap-2 text-sm">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} className="text-muted-foreground hover:text-foreground">
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
