import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeasonProgress } from "./season-progress";

describe("SeasonProgress", () => {
  it("renders nothing when no episodes have aired yet", () => {
    const { container } = render(<SeasonProgress airedCount={0} watchedCount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the watched-of-aired readout", () => {
    render(<SeasonProgress airedCount={10} watchedCount={4} />);
    expect(screen.getByText("4 of 10 episodes")).toBeInTheDocument();
  });

  it("uses aired episodes as the denominator, not the season's full episode count", () => {
    render(<SeasonProgress airedCount={3} watchedCount={3} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.getByText("3 of 3 episodes")).toBeInTheDocument();
  });

  it("pluralizes a single aired episode correctly", () => {
    render(<SeasonProgress airedCount={1} watchedCount={0} />);
    expect(screen.getByText("0 of 1 episode")).toBeInTheDocument();
  });
});
