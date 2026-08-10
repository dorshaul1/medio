import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TasteRatingsSection } from "./taste-ratings-section";

describe("TasteRatingsSection", () => {
  it("renders nothing when neither a distribution nor a comparison is eligible", () => {
    const { container } = render(<TasteRatingsSection distribution={null} comparison={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the rating distribution with a real count beside each bar", () => {
    render(
      <TasteRatingsSection
        distribution={{
          totalRatings: 5,
          buckets: [
            { rating: 1, count: 0 },
            { rating: 2, count: 0 },
            { rating: 3, count: 1 },
            { rating: 4, count: 1 },
            { rating: 5, count: 3 },
          ],
        }}
        comparison={null}
      />,
    );
    expect(screen.getByText("5 stars")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("never reports zero for a missing side of the Movie/Show comparison", () => {
    render(
      <TasteRatingsSection
        distribution={null}
        comparison={{ movieAverage: 4.2, showAverage: 3.6 }}
      />,
    );
    expect(screen.getByText("4.2")).toBeInTheDocument();
    expect(screen.getByText("3.6")).toBeInTheDocument();
  });
});
