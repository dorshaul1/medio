import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CastMember } from "@/server/media/types";
import { MovieCastRow } from "./movie-cast-row";

// MediaRowScroller (rendered inside) needs ResizeObserver — see its own
// test file for why this is stubbed locally rather than in test/setup.ts.
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

const CAST: readonly CastMember[] = [
  { id: 819, name: "Edward Norton", character: "The Narrator", profile: { path: "/e.jpg" } },
  { id: 287, name: "Brad Pitt", character: "Tyler Durden", profile: null },
];

describe("MovieCastRow", () => {
  it("renders a heading and every cast member", () => {
    render(<MovieCastRow cast={CAST} />);

    expect(screen.getByRole("heading", { name: "Cast" })).toBeInTheDocument();
    expect(screen.getByText("Edward Norton")).toBeInTheDocument();
    expect(screen.getByText("Brad Pitt")).toBeInTheDocument();
  });

  it("renders nothing when there's no cast data", () => {
    const { container } = render(<MovieCastRow cast={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
