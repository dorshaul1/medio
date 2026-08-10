import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Episode } from "@/server/media/types";
import type { EpisodeWatchSummary } from "@/server/tracking/types";
import { EpisodeList } from "./episode-list";

const markEpisodeWatchedAction = vi.fn();
const unmarkEpisodeWatchedAction = vi.fn();
vi.mock("./show-tracking-actions", () => ({
  markEpisodeWatchedAction: (...args: unknown[]) => markEpisodeWatchedAction(...args),
  unmarkEpisodeWatchedAction: (...args: unknown[]) => unmarkEpisodeWatchedAction(...args),
}));

beforeEach(() => {
  markEpisodeWatchedAction.mockReset();
  unmarkEpisodeWatchedAction.mockReset();
});

function episode(overrides: Partial<Episode>): Episode {
  return {
    id: 1,
    episodeNumber: 1,
    seasonNumber: 1,
    title: "Winter Is Coming",
    overview: null,
    runtimeMinutes: null,
    airDate: null,
    still: null,
    providerRating: 0,
    ...overrides,
  };
}

const NO_SUMMARIES: ReadonlyMap<number, EpisodeWatchSummary> = new Map();

describe("EpisodeList", () => {
  it("renders every episode as a list item", () => {
    render(
      <EpisodeList
        showProviderId={1399}
        episodes={[
          episode({ id: 1, episodeNumber: 1, title: "Winter Is Coming" }),
          episode({ id: 2, episodeNumber: 2, title: "The Kingsroad" }),
        ]}
        summaries={NO_SUMMARIES}
        spoilerProtection="off"
      />,
    );

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Winter Is Coming" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Kingsroad" })).toBeInTheDocument();
  });

  it("shows a quiet empty state instead of an empty list for a season with no episodes", () => {
    render(
      <EpisodeList
        showProviderId={1399}
        episodes={[]}
        summaries={NO_SUMMARIES}
        spoilerProtection="off"
      />,
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("No episodes found for this season.")).toBeInTheDocument();
  });

  it("passes each episode's watch summary through by episode number", () => {
    render(
      <EpisodeList
        showProviderId={1399}
        episodes={[episode({ id: 1, episodeNumber: 1, airDate: "2011-04-17" })]}
        summaries={
          new Map([[1, { hasWatched: true, watchCount: 1, lastWatchedAt: new Date("2024-01-01") }]])
        }
        spoilerProtection="off"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Mark episode 1 as not watched" }),
    ).toBeInTheDocument();
  });

  it("marks the first aired-but-unwatched episode as next, skipping already-watched ones", () => {
    render(
      <EpisodeList
        showProviderId={1399}
        episodes={[
          episode({ id: 1, episodeNumber: 1, title: "Winter Is Coming", airDate: "2011-04-17" }),
          episode({ id: 2, episodeNumber: 2, title: "The Kingsroad", airDate: "2011-04-24" }),
        ]}
        summaries={
          new Map([[1, { hasWatched: true, watchCount: 1, lastWatchedAt: new Date("2024-01-01") }]])
        }
        spoilerProtection="off"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "The Kingsroad — Next episode" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Winter Is Coming — Next episode" }),
    ).not.toBeInTheDocument();
  });

  it("never marks an unaired episode as next", () => {
    render(
      <EpisodeList
        showProviderId={1399}
        episodes={[
          episode({ id: 1, episodeNumber: 1, title: "Future Episode", airDate: "2099-01-01" }),
        ]}
        summaries={NO_SUMMARIES}
        spoilerProtection="off"
      />,
    );
    expect(
      screen.queryByRole("heading", { name: "Future Episode — Next episode" }),
    ).not.toBeInTheDocument();
  });
});
