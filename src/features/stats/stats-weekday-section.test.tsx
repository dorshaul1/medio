import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsWeekdaySection } from "./stats-weekday-section";

const BUCKETS = [
  { key: "Mon", label: "Mon", eventCount: 1 },
  { key: "Tue", label: "Tue", eventCount: 0 },
  { key: "Wed", label: "Wed", eventCount: 4 },
  { key: "Thu", label: "Thu", eventCount: 1 },
  { key: "Fri", label: "Fri", eventCount: 0 },
  { key: "Sat", label: "Sat", eventCount: 0 },
  { key: "Sun", label: "Sun", eventCount: 0 },
];

describe("StatsWeekdaySection", () => {
  it("renders nothing when there is no weekday rhythm", () => {
    const { container } = render(<StatsWeekdaySection weekday={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when every bucket is zero", () => {
    const { container } = render(
      <StatsWeekdaySection
        weekday={{ mostActiveDay: null, buckets: BUCKETS.map((b) => ({ ...b, eventCount: 0 })) }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("names the most active day and gives every bucket an accessible count", () => {
    render(<StatsWeekdaySection weekday={{ mostActiveDay: "Wed", buckets: BUCKETS }} />);
    expect(screen.getByText("Wed is your most active viewing day")).toBeInTheDocument();
    expect(screen.getByText("Wed: 4 viewings")).toBeInTheDocument();
    expect(screen.getByText("Mon: 1 viewing")).toBeInTheDocument();
  });

  it("uses a neutral heading when every day is tied", () => {
    render(
      <StatsWeekdaySection
        weekday={{ mostActiveDay: null, buckets: BUCKETS.map((b) => ({ ...b, eventCount: 1 })) }}
      />,
    );
    expect(screen.getByText("When you watch")).toBeInTheDocument();
  });
});
