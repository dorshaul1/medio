import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LibrarySearch } from "./library-search";

const replace = vi.fn();
let currentSearchParams = "";

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentSearchParams),
}));

// Same fireEvent-over-userEvent reasoning as discover-search-input.test.tsx:
// userEvent's own internal async waits don't reliably resolve against a
// fake clock.
describe("LibrarySearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockReset();
    currentSearchParams = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces typing before updating the URL", () => {
    render(<LibrarySearch initialQuery="" />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "d" } });
    fireEvent.change(input, { target: { value: "du" } });
    fireEvent.change(input, { target: { value: "dune" } });
    expect(replace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/library?q=dune", { scroll: false });
  });

  it("preserves existing filters (e.g. ?type=movie) when committing a search", () => {
    currentSearchParams = "type=movie";
    render(<LibrarySearch initialQuery="" />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dune" } });
    vi.advanceTimersByTime(250);

    const url = new URL(replace.mock.calls[0]?.[0], "http://x");
    expect(url.searchParams.get("type")).toBe("movie");
    expect(url.searchParams.get("q")).toBe("dune");
  });

  it("drops an existing ?count= and ?sort= when a new search is committed", () => {
    currentSearchParams = "count=48&sort=added";
    render(<LibrarySearch initialQuery="" />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dune" } });
    vi.advanceTimersByTime(250);

    const url = new URL(replace.mock.calls[0]?.[0], "http://x");
    expect(url.searchParams.has("count")).toBe(false);
    expect(url.searchParams.has("sort")).toBe(false);
  });

  it("clears immediately on Escape", () => {
    render(<LibrarySearch initialQuery="dune" />);
    const input = screen.getByRole("searchbox");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveValue("");
    expect(replace).toHaveBeenCalledWith("/library", { scroll: false });
  });

  it("shows a clear button once there's a value", () => {
    render(<LibrarySearch initialQuery="dune" />);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
});
