import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarFilterToggle } from "./calendar-filter-toggle";

describe("CalendarFilterToggle", () => {
  it("marks the active filter with aria-current", () => {
    render(<CalendarFilterToggle active="tv" view="upcoming" />);
    expect(screen.getByRole("link", { name: "TV" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Movies" })).not.toHaveAttribute("aria-current");
  });

  it("preserves the current view when switching filter", () => {
    render(<CalendarFilterToggle active="all" view="calendar" />);
    expect(screen.getByRole("link", { name: "Movies" })).toHaveAttribute(
      "href",
      "/calendar?view=calendar&type=movies",
    );
  });

  it("offers exactly three options — All/TV/Movies, never a full toolbar", () => {
    render(<CalendarFilterToggle active="all" view="upcoming" />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});
