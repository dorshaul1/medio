import { notFound } from "next/navigation";
import { PageContainer } from "@/components/shell/page-container";
import { SettingsNav } from "@/features/settings/settings-nav";
import { isSettingsCategory } from "@/features/settings/settings-params";

// A secondary utility destination, not one of the primary four (see
// docs/settings.md) — its own category rail beside the active category's
// content, both URL-addressable (`/settings/[category]`) so Back/
// Forward/refresh/deep-linking all work naturally.
export default async function SettingsCategoryLayout({
  children,
  params,
}: LayoutProps<"/settings/[category]">) {
  const { category } = await params;
  if (!isSettingsCategory(category)) notFound();

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Settings</h1>
        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <SettingsNav active={category} />
          <div className="min-w-0 max-w-2xl flex-1">{children}</div>
        </div>
      </div>
    </PageContainer>
  );
}
