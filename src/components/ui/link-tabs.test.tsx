import { render, screen } from "@testing-library/react";
import type { Route } from "next";
import { describe, expect, it } from "vitest";
import { LinkTabs } from "./link-tabs";

const ITEMS = [
  { value: "overview", label: "Overview", href: "/stats" as Route },
  { value: "taste", label: "Taste", href: "/stats?tab=taste" as Route },
];

describe("LinkTabs", () => {
  it("marks the active tab with aria-current, not the others", () => {
    render(<LinkTabs ariaLabel="Stats section" active="taste" items={ITEMS} />);
    expect(screen.getByRole("link", { name: "Taste" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("renders every item's real href", () => {
    render(<LinkTabs ariaLabel="Stats section" active="overview" items={ITEMS} />);
    expect(screen.getByRole("link", { name: "Taste" })).toHaveAttribute("href", "/stats?tab=taste");
  });

  it("exposes the group under the given accessible name", () => {
    render(<LinkTabs ariaLabel="Media type" active="overview" items={ITEMS} />);
    expect(screen.getByRole("navigation", { name: "Media type" })).toBeInTheDocument();
  });
});
