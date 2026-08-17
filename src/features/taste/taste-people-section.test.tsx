import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PersonTasteStat } from "@/server/stats/types";
import { TastePeopleSection } from "./taste-people-section";

function person(overrides: Partial<PersonTasteStat> = {}): PersonTasteStat {
  return {
    personId: 525,
    name: "Christopher Nolan",
    titleCount: 3,
    profile: null,
    ...overrides,
  };
}

describe("TastePeopleSection", () => {
  it("renders nothing when there are no favorite people yet", () => {
    const { container } = render(<TastePeopleSection directors={[]} actors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links a favorite director to their real Person page, with a descriptive accessible name", () => {
    render(<TastePeopleSection directors={[person()]} actors={[]} />);

    const link = screen.getByRole("link", { name: /Christopher Nolan/ });
    expect(link).toHaveAttribute("href", "/people/525");
    expect(link).toHaveAccessibleName(/favorite director/);
    expect(link).toHaveAccessibleName(/3 titles/);
  });

  it("renders Directors and Actors as independent rows", () => {
    render(
      <TastePeopleSection
        directors={[person()]}
        actors={[person({ personId: 819, name: "Edward Norton" })]}
      />,
    );

    expect(screen.getByText("Directors")).toBeInTheDocument();
    expect(screen.getByText("Actors")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edward Norton/ })).toHaveAttribute(
      "href",
      "/people/819",
    );
  });
});
