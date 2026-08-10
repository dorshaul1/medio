import type { LucideIcon } from "lucide-react";
import { ChartNoAxesColumn, Compass, Home, Library } from "lucide-react";
import type { Route } from "next";

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
};

// Single source of truth for the primary destinations — desktop and mobile
// navigation both render from this list instead of duplicating hrefs/labels/icons.
// `ChartNoAxesColumn` (a plain column shape, no axis lines/gridlines) reads as
// "insight/visualization" without the corporate-dashboard connotation a
// gauge/speedometer icon would carry — see docs/stats.md.
export const primaryNavigation: readonly NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/library", label: "Library", icon: Library },
  { href: "/stats", label: "Stats", icon: ChartNoAxesColumn },
];

// Exact match, except a destination also counts as active for any of its
// own nested routes (e.g. Discover's genre browse pages,
// /discover/movies/genre/comedy) — "/" is deliberately never treated as a
// prefix of everything else.
export function isNavItemActive(pathname: string, href: Route): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
