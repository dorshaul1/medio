import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Episode } from "@/server/media/types";
import type { EpisodeWatchSummary } from "@/server/tracking/types";
import { EpisodeRow } from "./episode-row";

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

const EPISODE: Episode = {
  id: 63056,
  episodeNumber: 1,
  seasonNumber: 1,
  title: "Winter Is Coming",
  overview: "Ned Stark is torn between his family and his duty.",
  runtimeMinutes: 62,
  airDate: "2011-04-17",
  still: { path: "/still.jpg" },
  providerRating: 8.1,
};

const UNWATCHED: EpisodeWatchSummary = { hasWatched: false, watchCount: 0, lastWatchedAt: null };
const WATCHED: EpisodeWatchSummary = { hasWatched: true, watchCount: 1, lastWatchedAt: new Date() };

// Spoiler protection defaults to "off" throughout this file — these
// tests are about row layout/behavior, not Spoiler policy itself (see
// episode-row.spoilers.test.tsx for that).

describe("EpisodeRow", () => {
  it("renders the episode number and title as separate, readable elements", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(screen.getByRole("heading", { name: "Winter Is Coming" })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("marks the season's next unwatched aired episode for assistive tech, not just visually", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          isNext
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(
      screen.getByRole("heading", { name: "Winter Is Coming — Next episode" }),
    ).toBeInTheDocument();
  });

  it("does not mark a regular episode as next", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(
      screen.queryByRole("heading", { name: "Winter Is Coming — Next episode" }),
    ).not.toBeInTheDocument();
  });

  it("renders a human-readable air date and formatted runtime", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(screen.getByText("Apr 17, 2011 · 1h 2m")).toBeInTheDocument();
  });

  it("renders the overview when present", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(
      screen.getByText("Ned Stark is torn between his family and his duty."),
    ).toBeInTheDocument();
  });

  it("offers a watch control for an aired episode", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(screen.getByRole("button", { name: "Mark episode 1 watched" })).toBeInTheDocument();
  });

  it("shows Upcoming instead of a watch control for an unaired episode", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={{ ...EPISODE, airDate: "2999-01-01" }}
          summary={UNWATCHED}
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("defaults to an unwatched summary when none is provided", () => {
    render(
      <ol>
        <EpisodeRow showProviderId={1399} episode={EPISODE} spoilerProtection="off" />
      </ol>,
    );
    expect(screen.getByRole("button", { name: "Mark episode 1 watched" })).toBeInTheDocument();
  });

  it("omits the metadata line entirely when both air date and runtime are missing", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={{ ...EPISODE, airDate: null, runtimeMinutes: null }}
          summary={UNWATCHED}
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it("renders a fallback instead of an image when there's no still", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={{ ...EPISODE, still: null }}
          summary={UNWATCHED}
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  });
});

describe("EpisodeRow spoiler protection", () => {
  it("shows everything under Off", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          spoilerProtection="off"
        />
      </ol>,
    );
    expect(screen.getByRole("heading", { name: "Winter Is Coming" })).toBeInTheDocument();
    expect(
      screen.getByText("Ned Stark is torn between his family and his duty."),
    ).toBeInTheDocument();
  });

  it("hides only the overview under Standard, keeping the real title", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          spoilerProtection="standard"
        />
      </ol>,
    );
    expect(screen.getByRole("heading", { name: "Winter Is Coming" })).toBeInTheDocument();
    expect(
      screen.queryByText("Ned Stark is torn between his family and his duty."),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Hidden by spoiler settings")).toBeInTheDocument();
  });

  it("hides the title too under Strict", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          spoilerProtection="strict"
        />
      </ol>,
    );
    expect(screen.queryByRole("heading", { name: "Winter Is Coming" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Episode 1" })).toBeInTheDocument();
  });

  it("never hides a watched episode's content", () => {
    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={WATCHED}
          spoilerProtection="strict"
        />
      </ol>,
    );
    expect(screen.getByRole("heading", { name: "Winter Is Coming" })).toBeInTheDocument();
    expect(
      screen.getByText("Ned Stark is torn between his family and his duty."),
    ).toBeInTheDocument();
  });

  it("reveals hidden content for just that row when the reveal control is used", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(
      <ol>
        <EpisodeRow
          showProviderId={1399}
          episode={EPISODE}
          summary={UNWATCHED}
          spoilerProtection="strict"
        />
      </ol>,
    );

    await user.click(screen.getByRole("button", { name: "Show details for episode 1" }));

    expect(screen.getByRole("heading", { name: "Winter Is Coming" })).toBeInTheDocument();
    expect(
      screen.getByText("Ned Stark is torn between his family and his duty."),
    ).toBeInTheDocument();
  });
});
