import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActiveShowContinuation } from "@/server/home/types";
import { PersonalizedHomeSections } from "./personalized-home-sections";

const getPersonalHome = vi.fn();
vi.mock("@/server/home/queries", () => ({
  getPersonalHome: () => getPersonalHome(),
}));
vi.mock("./up-next-mark-watched-button", () => ({
  UpNextMarkWatchedButton: () => <button type="button">Mark watched</button>,
}));

// MediaRowScroller (rendered inside Continue Watching/Finish Soon) needs
// ResizeObserver — see its own test file for why this is stubbed locally
// rather than in test/setup.ts.
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

function show(
  overrides: Partial<ActiveShowContinuation> & { showProviderId: number },
): ActiveShowContinuation {
  return {
    title: `Show ${overrides.showProviderId}`,
    poster: null,
    backdrop: null,
    year: 2020,
    lastActivityAt: new Date(),
    airedEpisodeCount: 10,
    watchedEpisodeCount: 4,
    remainingAiredEpisodeCount: 6,
    nextEpisode: {
      seasonNumber: 1,
      episodeNumber: 5,
      episodeProviderId: overrides.showProviderId * 10,
      title: "Episode",
      runtimeMinutes: 40,
    },
    ...overrides,
  };
}

// A Server Component — render it via its resolved value, the same
// pattern used elsewhere in this app for async components under test.
async function renderSections(
  overrides: Partial<{
    showUpNext: boolean;
    showFinishSoon: boolean;
    showContinuationRows: boolean;
  }> = {},
) {
  const element = await PersonalizedHomeSections({
    showUpNext: true,
    showFinishSoon: true,
    showContinuationRows: true,
    ...overrides,
  });
  render(element);
}

describe("PersonalizedHomeSections", () => {
  it("renders nothing for a user with no eligible active shows", async () => {
    getPersonalHome.mockResolvedValue({ upNext: null, finishSoon: [], continueWatching: [] });
    const element = await PersonalizedHomeSections({
      showUpNext: true,
      showFinishSoon: true,
      showContinuationRows: true,
    });
    expect(element).toBeNull();
  });

  it("renders nothing when the read fails, rather than breaking Home", async () => {
    getPersonalHome.mockRejectedValue(new Error("db unavailable"));
    const element = await PersonalizedHomeSections({
      showUpNext: true,
      showFinishSoon: true,
      showContinuationRows: true,
    });
    expect(element).toBeNull();
  });

  it("renders Up Next alone when it's the only eligible show", async () => {
    getPersonalHome.mockResolvedValue({
      upNext: show({ showProviderId: 1, title: "Up Next Show" }),
      finishSoon: [],
      continueWatching: [],
    });
    await renderSections();

    expect(screen.getByRole("heading", { name: "Up Next Show" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Continue Watching" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Finish Soon" })).not.toBeInTheDocument();
  });

  it("renders all three sections when each has content", async () => {
    getPersonalHome.mockResolvedValue({
      upNext: show({ showProviderId: 1, title: "Up Next Show" }),
      finishSoon: [
        show({ showProviderId: 2, title: "Finish Soon Show", remainingAiredEpisodeCount: 2 }),
      ],
      continueWatching: [show({ showProviderId: 3, title: "Continue Watching Show" })],
    });
    await renderSections();

    expect(screen.getByRole("heading", { level: 2, name: "Up Next Show" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Finish Soon" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Continue Watching" })).toBeInTheDocument();
  });

  it("omits Finish Soon entirely when the preference is off, without affecting other sections", async () => {
    getPersonalHome.mockResolvedValue({
      upNext: show({ showProviderId: 1, title: "Up Next Show" }),
      finishSoon: [show({ showProviderId: 2, title: "Finish Soon Show" })],
      continueWatching: [show({ showProviderId: 3, title: "Continue Watching Show" })],
    });
    await renderSections({ showFinishSoon: false });

    expect(screen.queryByRole("heading", { name: "Finish Soon" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Continue Watching" })).toBeInTheDocument();
  });

  describe("showUpNext off", () => {
    it("hides the Up Next card and folds its show into the front of Continue Watching", async () => {
      getPersonalHome.mockResolvedValue({
        upNext: show({ showProviderId: 1, title: "Up Next Show" }),
        finishSoon: [],
        continueWatching: [show({ showProviderId: 2, title: "Continue Watching Show" })],
      });
      await renderSections({ showUpNext: false });

      expect(
        screen.queryByRole("heading", { level: 2, name: "Up Next Show" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Continue Watching" })).toBeInTheDocument();
      const links = screen.getAllByRole("link").map((link) => link.getAttribute("aria-label"));
      expect(links[0]).toMatch(/Up Next Show/);
    });

    it("never fabricates a Continue Watching row when showContinuationRows is false (Calendar layout)", async () => {
      getPersonalHome.mockResolvedValue({
        upNext: show({ showProviderId: 1, title: "Up Next Show" }),
        finishSoon: [],
        continueWatching: [],
      });
      const element = await PersonalizedHomeSections({
        showUpNext: false,
        showFinishSoon: true,
        showContinuationRows: false,
      });
      expect(element).toBeNull();
    });

    it("hides gracefully when there's no eligible show at all, even with showUpNext on", async () => {
      getPersonalHome.mockResolvedValue({ upNext: null, finishSoon: [], continueWatching: [] });
      const element = await PersonalizedHomeSections({
        showUpNext: true,
        showFinishSoon: true,
        showContinuationRows: true,
      });
      expect(element).toBeNull();
    });
  });

  describe("showContinuationRows off (Calendar layout)", () => {
    it("renders Up Next alone, never Finish Soon/Continue Watching", async () => {
      getPersonalHome.mockResolvedValue({
        upNext: show({ showProviderId: 1, title: "Up Next Show" }),
        finishSoon: [show({ showProviderId: 2, title: "Finish Soon Show" })],
        continueWatching: [show({ showProviderId: 3, title: "Continue Watching Show" })],
      });
      await renderSections({ showContinuationRows: false });

      expect(screen.getByRole("heading", { level: 2, name: "Up Next Show" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Finish Soon" })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Continue Watching" })).not.toBeInTheDocument();
    });
  });
});
