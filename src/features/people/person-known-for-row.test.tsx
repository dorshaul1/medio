import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PersonKnownForItem } from "@/server/people/types";
import { PersonKnownForRow } from "./person-known-for-row";

// MediaRowScroller (the row's client boundary) needs ResizeObserver —
// jsdom doesn't implement it, stubbed the same way media-row-scroller.test.tsx does.
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

function item(overrides: Partial<PersonKnownForItem> = {}): PersonKnownForItem {
  return {
    mediaType: "movie",
    mediaProviderId: 1,
    title: "Inception",
    poster: null,
    year: 2010,
    ...overrides,
  };
}

describe("PersonKnownForRow", () => {
  it("renders nothing when there are no items — no empty 'Known for' section", () => {
    const { container } = render(<PersonKnownForRow items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each item as a link to its movie/show page", () => {
    render(
      <PersonKnownForRow
        items={[
          item({ mediaProviderId: 1, mediaType: "movie", title: "Inception" }),
          item({ mediaProviderId: 2, mediaType: "show", title: "Peaky Blinders" }),
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /Inception/ })).toHaveAttribute("href", "/movies/1");
    expect(screen.getByRole("link", { name: /Peaky Blinders/ })).toHaveAttribute(
      "href",
      "/shows/2",
    );
  });

  it("renders a media-type fallback icon instead of a broken image when the poster is missing", () => {
    render(<PersonKnownForRow items={[item({ poster: null })]} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
