import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaSummary } from "@/server/media/types";
import { MediaCollectionRow } from "./media-collection-row";

// jsdom doesn't implement ResizeObserver — MediaRowScroller (rendered by
// every row) needs it. See media-row-scroller.test.tsx's identical stub.
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

const MOVIE: MediaSummary = {
  mediaType: "movie",
  id: 550,
  title: "Fight Club",
  originalTitle: "Fight Club",
  overview: null,
  releaseDate: "1999-10-15",
  releaseYear: 1999,
  poster: null,
  backdrop: null,
  providerRating: 8.4,
  voteCount: 26000,
  genreIds: [],
  adult: false,
};

describe("MediaCollectionRow", () => {
  it("renders nothing for an empty item list", () => {
    const { container } = render(<MediaCollectionRow id="row" title="Trending" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("marks a title watched from a batched personalStates map", () => {
    render(
      <MediaCollectionRow
        id="row"
        title="Trending"
        items={[MOVIE]}
        personalStates={new Map([["movie:550", { kind: "watched" }]])}
      />,
    );
    expect(screen.getByRole("link", { name: "Fight Club, watched" })).toBeInTheDocument();
  });

  it("renders plain, state-unaware posters when no personal state is supplied", () => {
    render(<MediaCollectionRow id="row" title="Trending" items={[MOVIE]} />);
    expect(screen.getByRole("link", { name: "Fight Club 1999" })).toBeInTheDocument();
  });
});
