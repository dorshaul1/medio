import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaRowScroller } from "./media-row-scroller";

// jsdom doesn't implement ResizeObserver — stubbed here only (not
// test/setup.ts) since this is currently the only component that needs it.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MediaRowScroller", () => {
  it("renders its children", () => {
    render(
      <MediaRowScroller>
        <div>Poster one</div>
        <div>Poster two</div>
      </MediaRowScroller>,
    );

    expect(screen.getByText("Poster one")).toBeInTheDocument();
    expect(screen.getByText("Poster two")).toBeInTheDocument();
  });

  it("shows no scroll buttons when the row doesn't overflow", () => {
    // jsdom reports scrollWidth/clientWidth as 0 by default — i.e. no
    // overflow — so neither button should render.
    render(
      <MediaRowScroller>
        <div>Poster one</div>
      </MediaRowScroller>,
    );

    expect(screen.queryByRole("button", { name: "Scroll left" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scroll right" })).not.toBeInTheDocument();
  });
});
