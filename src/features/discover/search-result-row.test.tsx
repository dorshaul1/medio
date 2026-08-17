import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaSummary } from "@/server/media/types";
import { SearchResultRow } from "./search-result-row";

// Same reasoning as planning-control.test.tsx: PlanningControl's own
// action module ultimately imports server-only domain code, which must
// never actually execute under jsdom.
const changePlanningIntentAction = vi.fn();
const removePlanningItemAction = vi.fn();
vi.mock("@/features/media/planning-actions", () => ({
  changePlanningIntentAction: (...args: unknown[]) => changePlanningIntentAction(...args),
  removePlanningItemAction: (...args: unknown[]) => removePlanningItemAction(...args),
}));

beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  changePlanningIntentAction.mockReset().mockResolvedValue(undefined);
  removePlanningItemAction.mockReset().mockResolvedValue(undefined);
});

const SHOW: MediaSummary = {
  mediaType: "show",
  id: 1399,
  title: "Game of Thrones",
  originalTitle: "Game of Thrones",
  overview: "Seven noble families fight.",
  releaseDate: "2011-04-17",
  releaseYear: 2011,
  poster: { path: "/got.jpg" },
  backdrop: null,
  providerRating: 8.4,
  voteCount: 21000,
  genreIds: [18],
  adult: false,
};

describe("SearchResultRow", () => {
  it("links to the canonical show route", () => {
    render(
      <SearchResultRow
        media={SHOW}
        personalState={{ kind: "none" }}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.getByRole("link", { name: /Game of Thrones/ })).toHaveAttribute(
      "href",
      "/shows/1399",
    );
  });

  it("links to the canonical movie route for a movie result", () => {
    render(
      <SearchResultRow
        media={{ ...SHOW, mediaType: "movie", id: 550, title: "Fight Club", releaseYear: 1999 }}
        personalState={{ kind: "none" }}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.getByRole("link", { name: /Fight Club/ })).toHaveAttribute("href", "/movies/550");
  });

  it("shows a subtle type tag distinguishing Movie from Show", () => {
    render(
      <SearchResultRow
        media={SHOW}
        personalState={{ kind: "none" }}
        defaultSaveIntent="watchlist"
      />,
    );
    expect(screen.getByText("Show")).toBeInTheDocument();
  });

  it("falls back to a type-appropriate placeholder when there's no poster", () => {
    render(
      <SearchResultRow
        media={{ ...SHOW, poster: null }}
        personalState={{ kind: "none" }}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("offers a quick Save action for an unsaved result", () => {
    render(
      <SearchResultRow
        media={SHOW}
        personalState={{ kind: "none" }}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(
      screen.getByRole("button", { name: `Save ${SHOW.title} to Watchlist` }),
    ).toBeInTheDocument();
  });

  it("shows a quiet Watchlist state and its own compact save trigger for a saved result", () => {
    render(
      <SearchResultRow
        media={SHOW}
        personalState={{ kind: "watchlist" }}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.getByText("Watchlist")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `${SHOW.title}: saved to Watchlist` }),
    ).toBeInTheDocument();
  });

  it("shows a quiet Watched state and no Save control for a watched movie", () => {
    render(
      <SearchResultRow
        media={{ ...SHOW, mediaType: "movie", id: 550 }}
        personalState={{ kind: "watched" }}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.getByText("Watched")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a quiet Watching state and no Save control for an actively-watching show", () => {
    render(
      <SearchResultRow
        media={SHOW}
        personalState={{ kind: "watching" }}
        defaultSaveIntent="watchlist"
      />,
    );

    expect(screen.getByText("Watching")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
