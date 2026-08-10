"use client";

import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconButton } from "@/components/ui/icon-button";
import { authClient } from "@/lib/auth-client";

// The smallest useful identity treatment: name/email (truncated, no
// avatar — Better Auth's `image` is normally absent for email/password
// accounts, and a generated placeholder avatar would look accidental, not
// designed) plus the two controls that belong in this secondary area.
// Settings lives here (desktop: bottom of the side rail; mobile: the
// header strip) rather than as a sixth/fifth primary nav destination —
// see docs/settings.md. Theme moved into Settings itself (a visual
// picker with real previews, not a quick cycle-through icon), so the
// standalone `ThemeToggle` that used to live here was removed as dead
// UI rather than kept as a duplicate control.
export function AccountControl({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleSignOut() {
    void authClient.signOut().then(() => {
      router.push("/sign-in");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="min-w-0 truncate text-xs text-muted-foreground" title={email}>
        {name || email}
      </span>
      <div className="flex shrink-0 items-center">
        <IconButton
          asChild
          aria-label="Settings"
          variant="ghost"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
        >
          <Link href="/settings">
            <Settings />
          </Link>
        </IconButton>
        <IconButton aria-label="Sign out" variant="ghost" onClick={handleSignOut}>
          <LogOut />
        </IconButton>
      </div>
    </div>
  );
}
