import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsComparisonSection } from "./stats-comparison";

describe("StatsComparisonSection", () => {
  it("renders nothing when there's no comparison", () => {
    const { container } = render(<StatsComparisonSection comparison={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each already-composed fact once, under the previous-period heading", () => {
    render(
      <StatsComparisonSection
        comparison={{
          previousLabel: "last month",
          facts: [
            { kind: "movies", text: "You watched more Movies than last month (2 → 5)." },
            { kind: "genreShift", text: "Comedy became more prominent than Drama was." },
          ],
        }}
      />,
    );

    expect(screen.getByText("Compared to last month")).toBeInTheDocument();
    expect(screen.getByText("You watched more Movies than last month (2 → 5).")).toBeInTheDocument();
    expect(screen.getByText("Comedy became more prominent than Drama was.")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
