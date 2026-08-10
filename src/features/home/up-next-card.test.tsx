import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActiveShowContinuation } from "@/server/home/types";
import { UpNextCard } from "./up-next-card";

vi.mock("./up-next-mark-watched-button", () => ({
  UpNextMarkWatchedButton: () => <button type="button">Mark watched</button>,
}));

const ITEM: ActiveShowContinuation = {
  showProviderId: 1396,
  title: "Breaking Bad",
  poster: { path: "/poster.jpg" },
  backdrop: { path: "/backdrop.jpg" },
  year: 2008,
  lastActivityAt: new Date("2024-01-01"),
  airedEpisodeCount: 62,
  watchedEpisodeCount: 3,
  remainingAiredEpisodeCount: 59,
  nextEpisode: {
    seasonNumber: 1,
    episodeNumber: 4,
    episodeProviderId: 999,
    title: "Cancer Man",
    runtimeMinutes: 48,
  },
};

describe("UpNextCard", () => {
  it("renders the show title as the section heading", () => {
    render(<UpNextCard item={ITEM} />);
    expect(screen.getByRole("heading", { level: 2, name: "Breaking Bad" })).toBeInTheDocument();
  });

  it("shows the episode coordinate and title, and remaining-episode count", () => {
    render(<UpNextCard item={ITEM} />);
    expect(screen.getByText("S1 E4 · Cancer Man")).toBeInTheDocument();
    expect(screen.getByText("59 episodes remaining")).toBeInTheDocument();
  });

  it("links Open episode to the canonical episode fragment, with real context in its accessible name", () => {
    render(<UpNextCard item={ITEM} />);
    const link = screen.getByRole("link", { name: "Open Breaking Bad, S1 E4, Cancer Man" });
    expect(link).toHaveAttribute("href", "/shows/1396/seasons/1#episode-4");
  });

  it("never renders playback language", () => {
    render(<UpNextCard item={ITEM} />);
    expect(screen.queryByText(/play|resume|watch now/i)).not.toBeInTheDocument();
  });

  it("offers a Mark watched action", () => {
    render(<UpNextCard item={ITEM} />);
    expect(screen.getByRole("button", { name: "Mark watched" })).toBeInTheDocument();
  });
});
