"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAvatar } from "@/components/shell/user-avatar";
import { cn } from "@/lib/utils";

// The one identity control in authenticated nav chrome — never a menu
// (see docs/settings.md, "Account"). Settings/Sign out used to be two
// separate icon buttons here; both now live inside Settings/Account
// itself, so this single control replaces all three without losing
// anything. Desktop goes straight to Account (the default category, and
// the destination that used to take a dedicated click) — mobile
// deliberately goes to the Settings list instead: mobile's `/settings`
// index page carries its own compact identity row at the top, so
// landing there first shows the category list mobile's own drill-down
// pattern expects, rather than skipping straight past it into one
// category. `aria-label` (not the visible text) carries the precise
// accessible name so CSS truncation of a long name never removes it
// from the accessibility tree.
export function UserIdentityLink({
  name,
  email,
  image,
  variant = "desktop",
}: {
  name: string;
  email: string;
  image: string | null;
  variant?: "desktop" | "mobile";
}) {
  const pathname = usePathname();
  const active = pathname.startsWith("/settings");
  const displayName = name || email;

  if (variant === "mobile") {
    return (
      <Link
        href="/settings"
        aria-label={`Open Settings for ${displayName}`}
        aria-current={active ? "page" : undefined}
        className="relative rounded-full outline-none before:absolute before:-inset-1.5 before:content-[''] focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserAvatar name={name} image={image} size="sm" />
      </Link>
    );
  }

  return (
    <Link
      href="/settings/account"
      aria-label={`Open account settings for ${displayName}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-2 outline-none transition-colors select-none",
        "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "bg-muted",
      )}
    >
      <UserAvatar name={name} image={image} size="sm" />
      <span className="min-w-0 truncate text-sm font-medium text-foreground">{displayName}</span>
    </Link>
  );
}
