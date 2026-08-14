import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeBacklogItem } from "@/server/home/types";
import { BacklogRow } from "./backlog-row";

// MediaRowScroller (rendered inside) needs ResizeObserver — see
// `continue-watching-row.test.tsx` for the same stub.
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

function item(overrides: Partial<HomeBacklogItem> & { mediaProviderId: number }): HomeBacklogItem {
  return {
    mediaType: "show",
    title: `Title ${overrides.mediaProviderId}`,
    poster: null,
    year: 2021,
    ...overrides,
  };
}

describe("BacklogRow", () => {
  it("renders nothing for an empty list", () => {
    const { container } = render(<BacklogRow items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a tile per item, linking straight to the title's own Details page", () => {
    render(
      <BacklogRow
        items={[item({ mediaProviderId: 1, mediaType: "show", title: "A Show", year: 2019 })]}
      />,
    );

    expect(screen.getByRole("heading", { name: "From your Backlog" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "A Show, 2019" });
    expect(link).toHaveAttribute("href", "/shows/1");
  });

  it("links a movie item to its own Movie Details page", () => {
    render(
      <BacklogRow
        items={[item({ mediaProviderId: 2, mediaType: "movie", title: "A Movie", year: 2020 })]}
      />,
    );
    expect(screen.getByRole("link", { name: "A Movie, 2020" })).toHaveAttribute(
      "href",
      "/movies/2",
    );
  });

  it("renders one tile per item, in the given order", () => {
    render(
      <BacklogRow
        items={[
          item({ mediaProviderId: 1, title: "First" }),
          item({ mediaProviderId: 2, title: "Second" }),
        ]}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
