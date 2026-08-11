import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ActivityBucket, ViewingRhythm } from "@/server/stats/types";
import { StatsTimeline } from "./stats-timeline";

function monthlyRhythm(counts: readonly number[], startYear = 2026, startMonth = 1): ViewingRhythm {
  const buckets: ActivityBucket[] = counts.map((eventCount, index) => ({
    key: `${startYear}-${startMonth + index}`,
    label: `M${startMonth + index}`,
    eventCount,
  }));
  return { granularity: "month", buckets };
}

describe("StatsTimeline", () => {
  it("renders nothing when there is no rhythm at all", () => {
    const { container } = render(<StatsTimeline rhythm={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when every bucket has zero activity", () => {
    const { container } = render(<StatsTimeline rhythm={monthlyRhythm(Array(12).fill(0))} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("exposes each bucket's exact count as real accessible text, not just bar height", () => {
    const rhythm = monthlyRhythm([0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5]);
    render(<StatsTimeline rhythm={rhythm} />);

    expect(screen.getByText("February 2026: 3 viewings")).toBeInTheDocument();
    expect(screen.getByText("December 2026: 5 viewings")).toBeInTheDocument();
    expect(screen.getByText("January 2026: 0 viewings")).toBeInTheDocument();
  });

  it("links the single busiest month into Diary, for month-granularity charts", () => {
    const rhythm = monthlyRhythm([1, 8, 2]);
    render(<StatsTimeline rhythm={rhythm} />);

    const link = screen.getByRole("link", { name: /February 2026 in Diary/ });
    expect(link).toHaveAttribute("href", "/library/diary?month=2026-02");
  });

  it("never shows a Diary link for year-granularity charts", () => {
    const rhythm: ViewingRhythm = {
      granularity: "year",
      buckets: [
        { key: "2025", label: "2025", eventCount: 4 },
        { key: "2026", label: "2026", eventCount: 9 },
      ],
    };
    render(<StatsTimeline rhythm={rhythm} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing for a single-bucket rhythm — one bar has no rhythm to show", () => {
    const rhythm: ViewingRhythm = {
      granularity: "year",
      buckets: [{ key: "2026", label: "2026", eventCount: 12 }],
    };
    const { container } = render(<StatsTimeline rhythm={rhythm} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("labels day-granularity buckets by day number in the accessible text", () => {
    const rhythm: ViewingRhythm = {
      granularity: "day",
      buckets: [
        { key: "2026-8-1", label: "1", eventCount: 0 },
        { key: "2026-8-2", label: "2", eventCount: 2 },
      ],
    };
    render(<StatsTimeline rhythm={rhythm} />);
    expect(screen.getByText("Day 2: 2 viewings")).toBeInTheDocument();
  });
});
