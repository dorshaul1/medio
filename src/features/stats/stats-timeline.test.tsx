import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MonthlyActivity } from "@/server/stats/types";
import { StatsTimeline } from "./stats-timeline";

function months(counts: readonly number[]): MonthlyActivity[] {
  return counts.map((eventCount, index) => ({
    year: 2026,
    month: index + 1,
    monthLabel: `M${index + 1}`,
    eventCount,
  }));
}

describe("StatsTimeline", () => {
  it("renders nothing when there is no timeline at all", () => {
    const { container } = render(<StatsTimeline timeline={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when every month has zero activity", () => {
    const { container } = render(<StatsTimeline timeline={months(Array(12).fill(0))} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("exposes each month's exact count as real accessible text, not just bar height", () => {
    const timeline = months([0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5]);
    render(<StatsTimeline timeline={timeline} />);

    expect(screen.getByText("M2 2026: 3 viewings")).toBeInTheDocument();
    expect(screen.getByText("M12 2026: 5 viewings")).toBeInTheDocument();
    expect(screen.getByText("M1 2026: 0 viewings")).toBeInTheDocument();
  });
});
