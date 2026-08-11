import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { GlobalSearchContext } from "./global-search-context";
import { GlobalSearchIconTrigger, GlobalSearchNavTrigger } from "./global-search-trigger";

function renderWithContext(ui: ReactElement, setOpen = vi.fn()) {
  render(
    <GlobalSearchContext.Provider value={{ open: false, setOpen }}>
      {ui}
    </GlobalSearchContext.Provider>,
  );
  return { setOpen };
}

describe("GlobalSearchNavTrigger", () => {
  it("opens GlobalSearch and shows the ⌘K hint", async () => {
    const user = userEvent.setup();
    const { setOpen } = renderWithContext(<GlobalSearchNavTrigger />);

    expect(screen.getByText("⌘K")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Search/ }));
    expect(setOpen).toHaveBeenCalledWith(true);
  });
});

describe("GlobalSearchIconTrigger", () => {
  it("has a precise accessible name and opens GlobalSearch", async () => {
    const user = userEvent.setup();
    const { setOpen } = renderWithContext(<GlobalSearchIconTrigger />);

    await user.click(screen.getByRole("button", { name: "Search Movies, Shows and People" }));
    expect(setOpen).toHaveBeenCalledWith(true);
  });
});
