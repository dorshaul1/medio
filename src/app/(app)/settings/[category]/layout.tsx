import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/shell/page-container";
import { SettingsNav } from "@/features/settings/settings-nav";
import { isSettingsCategory } from "@/features/settings/settings-params";

// A secondary utility destination, not one of the primary four (see
// docs/settings.md). Desktop keeps a single screen — the category rail
// beside the active category's content, both URL-addressable so Back/
// Forward/refresh/deep-linking all work naturally. Mobile is genuinely
// different, not a shrunk desktop: opening a category is a real drill-
// down — the list (`SettingsNav`, `/settings`) and the "Settings" page
// title both disappear; only a compact "Settings" back link and that
// one category's own content (which carries its own heading via
// `SettingsCategoryHeader`) remain, exactly like an iOS-style settings
// screen.
export default async function SettingsCategoryLayout({
  children,
  params,
}: LayoutProps<"/settings/[category]">) {
  const { category } = await params;
  if (!isSettingsCategory(category)) notFound();

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <h1 className="hidden text-2xl font-medium tracking-tight sm:text-3xl md:block">
          Settings
        </h1>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Settings
        </Link>

        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <div className="hidden md:block">
            <SettingsNav active={category} />
          </div>
          <div className="min-w-0 max-w-2xl flex-1">{children}</div>
        </div>
      </div>
    </PageContainer>
  );
}
