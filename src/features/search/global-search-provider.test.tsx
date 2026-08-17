import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGlobalSearch } from "./global-search-context";
import { GlobalSearchProvider } from "./global-search-provider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/library",
}));

const getSearchSuggestionsAction = vi.fn();
vi.mock("@/features/search/search-actions", () => ({
  getSearchSuggestionsAction: (...args: unknown[]) => getSearchSuggestionsAction(...args),
}));

vi.mock("@/features/command-center/command-center-actions", () => ({
  getUpNextCommandDataAction: () => Promise.resolve(null),
}));

vi.mock("@/features/movies/movie-tracking-actions", () => ({
  markMovieWatchedAction: vi.fn(),
}));

vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: vi.fn(),
}));

vi.mock("@/features/media/planning-actions", () => ({
  changePlanningIntentAction: vi.fn(),
  removePlanningItemAction: vi.fn(),
}));

function Probe() {
  const { open } = useGlobalSearch();
  return <span>{open ? "open" : "closed"}</span>;
}

describe("GlobalSearchProvider", () => {
  it("starts closed", () => {
    render(
      <GlobalSearchProvider>
        <Probe />
      </GlobalSearchProvider>,
    );
    expect(screen.getByText("closed")).toBeInTheDocument();
  });

  it("toggles open on Cmd+K / Ctrl+K", () => {
    render(
      <GlobalSearchProvider>
        <Probe />
      </GlobalSearchProvider>,
    );

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByText("open")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByText("closed")).toBeInTheDocument();
  });

  it("also responds to Ctrl+K (non-Mac)", () => {
    render(
      <GlobalSearchProvider>
        <Probe />
      </GlobalSearchProvider>,
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it("ignores a bare 'k' with no modifier", () => {
    render(
      <GlobalSearchProvider>
        <Probe />
      </GlobalSearchProvider>,
    );

    fireEvent.keyDown(document, { key: "k" });
    expect(screen.getByText("closed")).toBeInTheDocument();
  });
});
