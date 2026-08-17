import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/shell/user-avatar";
import { ChangePasswordControl } from "./change-password-control";
import { DisplayNameSetting } from "./display-name-setting";
import { LogoutControl } from "./logout-control";
import { SettingRow } from "./setting-row";
import { SettingsCategoryHeader } from "./settings-category-header";

// Account — who you are and how you sign in (see docs/settings.md,
// "Account"). Deliberately not a social Profile: identity, password, and
// session only, nothing public-facing. Email has no editable control —
// this app has no email-change/verification flow, so pretending it's
// editable would be a dead control (see CLAUDE.md, "Settings").
export function AccountSettings({
  user,
}: {
  user: { name: string; email: string; image: string | null };
}) {
  return (
    <div className="flex flex-col gap-2">
      <SettingsCategoryHeader
        title="Account"
        description="Your identity and how you sign in — never shared or made public."
      />
      <Separator />

      <div className="flex items-center gap-4 py-3">
        <UserAvatar name={user.name} image={user.image} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <DisplayNameSetting value={user.name} />
          <p className="truncate text-sm text-muted-foreground" title={user.email}>
            {user.email}
          </p>
        </div>
      </div>

      <Separator />
      <SettingRow title="Password" comment="Change the password you use to sign in to MEDIO.">
        <ChangePasswordControl />
      </SettingRow>

      <Separator />
      <SettingRow title="Log out" comment="Sign out of MEDIO on this device.">
        <LogoutControl />
      </SettingRow>
    </div>
  );
}
