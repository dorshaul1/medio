import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PageContainer } from "@/components/shell/page-container";
import { UserAvatar } from "@/components/shell/user-avatar";
import { AccountSettings } from "@/features/settings/account-settings";
import { SettingsNav } from "@/features/settings/settings-nav";
import { DEFAULT_SETTINGS_CATEGORY } from "@/features/settings/settings-params";
import { requireSession } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Settings",
};

// `/settings`'s own landing content — see docs/settings.md, "Settings
// information architecture". On mobile this is a compact identity row
// (avatar, name, email — tapping it opens Account) above a plain
// category list, and nothing else (no content stacked beneath the list
// — see `SettingsNav`); tapping a category is a real navigation to
// `/settings/[category]`, which shows only that category's content plus
// a way back. On desktop, where the rail and content have always shown
// side by side, this renders Account beside the rail — the default
// category — so desktop's landing experience matches
// `/settings/account` exactly. (A plain `redirect()` to
// `/settings/account` would have been simpler but would remove the one
// URL mobile's "go back" link from a category page can land on to see
// the list again.)
export default async function SettingsPage() {
  const { user } = await requireSession();
  const identity = { name: user.name, email: user.email, image: user.image ?? null };

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Settings</h1>

        <Link
          href="/settings/account"
          aria-label={`Open account settings for ${identity.name || identity.email}`}
          className="flex items-center gap-3 rounded-md py-1 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
        >
          <UserAvatar name={identity.name} image={identity.image} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium text-foreground">
              {identity.name || identity.email}
            </p>
            <p className="truncate text-sm text-muted-foreground">{identity.email}</p>
          </div>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Link>

        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <SettingsNav active={DEFAULT_SETTINGS_CATEGORY} />
          <div className="hidden min-w-0 max-w-2xl flex-1 md:block">
            <AccountSettings user={identity} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
