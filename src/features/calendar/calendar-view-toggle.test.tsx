import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarViewToggle } from "./calendar-view-toggle";

describe("CalendarViewToggle", () => {
  it("marks the active view with aria-current", () => {
    render(<CalendarViewToggle active="upcoming" filter="all" />);
    expect(screen.getByRole("link", { name: "Upcoming" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Calendar" })).not.toHaveAttribute("aria-current");
  });

  it("always pins the view explicitly, even to 'upcoming' — omitting it would defer to the user's Default Calendar view preference instead of the tab actually clicked", () => {
    render(<CalendarViewToggle active="upcoming" filter="all" />);
    expect(screen.getByRole("link", { name: "Upcoming" })).toHaveAttribute(
      "href",
      "/calendar?view=upcoming",
    );
  });

  it("carries the active filter over into the other view's link", () => {
    render(<CalendarViewToggle active="upcoming" filter="tv" />);
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/calendar?view=calendar&type=tv",
    );
  });
});
