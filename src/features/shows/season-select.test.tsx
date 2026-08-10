import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SeasonSummary } from "@/server/media/types";
import { SeasonSelect } from "./season-select";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// jsdom doesn't implement these — Radix's Select uses them for its
// pointer-based open/close and scroll-into-view behavior. Stubbed locally
// (not test/setup.ts) since this is currently the only Select-driven test.
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function season(overrides: Partial<SeasonSummary>): SeasonSummary {
  return {
    id: 1,
    seasonNumber: 1,
    title: "Season 1",
    overview: "",
    airDate: null,
    episodeCount: 10,
    poster: null,
    ...overrides,
  };
}

const SEASONS: SeasonSummary[] = [
  season({ id: 1, seasonNumber: 1, title: "Season 1" }),
  season({ id: 2, seasonNumber: 2, title: "Season 2" }),
];

describe("SeasonSelect", () => {
  it("shows the current season as the selected value", () => {
    render(<SeasonSelect showId={1399} sortedSeasons={SEASONS} currentSeasonNumber={1} />);
    expect(screen.getByRole("combobox", { name: "Jump to season" })).toHaveTextContent("Season 1");
  });

  it("navigates to the chosen season on selection", async () => {
    const user = userEvent.setup();
    render(<SeasonSelect showId={1399} sortedSeasons={SEASONS} currentSeasonNumber={1} />);

    await user.click(screen.getByRole("combobox", { name: "Jump to season" }));
    await user.click(screen.getByRole("option", { name: "Season 2" }));

    expect(push).toHaveBeenCalledWith("/shows/1399/seasons/2");
  });
});
