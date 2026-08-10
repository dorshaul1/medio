import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiscoverSearchInput } from "./discover-search-input";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover",
  useRouter: () => ({ replace }),
}));

// fireEvent (synchronous, no internal timers of its own) rather than
// userEvent for anything exercised alongside vi.useFakeTimers() below —
// userEvent's own internal async waits don't reliably resolve against a
// fake clock, which just produces a flaky/hanging test, not a real one.
describe("DiscoverSearchInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces typing before updating the URL, rather than navigating per keystroke", () => {
    render(<DiscoverSearchInput initialQuery="" />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "s" } });
    fireEvent.change(input, { target: { value: "se" } });
    fireEvent.change(input, { target: { value: "sev" } });
    expect(replace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(350);

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/discover?q=sev", { scroll: false });
  });

  it("commits immediately on Enter, without waiting for the debounce", () => {
    render(<DiscoverSearchInput initialQuery="" />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "severance" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(replace).toHaveBeenCalledWith("/discover?q=severance", { scroll: false });
  });

  it("clears immediately on Escape and navigates back to plain /discover", () => {
    render(<DiscoverSearchInput initialQuery="severance" />);
    const input = screen.getByRole("searchbox");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveValue("");
    expect(replace).toHaveBeenCalledWith("/discover", { scroll: false });
  });

  it("shows a clear button once there's a value, and it navigates back to plain /discover", () => {
    render(<DiscoverSearchInput initialQuery="severance" />);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(replace).toHaveBeenCalledWith("/discover", { scroll: false });
  });

  it("has no clear button when there's no query", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<DiscoverSearchInput initialQuery="" />);

    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    // Sanity check the field is otherwise normally interactive.
    await user.click(screen.getByRole("searchbox"));
  });
});
