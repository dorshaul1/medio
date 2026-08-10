import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Person } from "@/server/media/types";
import { PersonHeader } from "./person-header";

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: 525,
    name: "Christopher Nolan",
    profile: null,
    biography: null,
    knownForDepartment: null,
    birthday: null,
    deathday: null,
    birthplace: null,
    ...overrides,
  };
}

describe("PersonHeader", () => {
  it("renders the person's name as the page's single h1", () => {
    render(<PersonHeader person={person()} age={null} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Christopher Nolan" }),
    ).toBeInTheDocument();
  });

  it("renders a readable profession label, not the raw TMDB department string", () => {
    render(<PersonHeader person={person({ knownForDepartment: "Directing" })} age={null} />);
    expect(screen.getByText("Director")).toBeInTheDocument();
  });

  it("renders born date, age, and birthplace as one concise line for a living person", () => {
    render(
      <PersonHeader
        person={person({ birthday: "1970-07-30", birthplace: "London, England, UK" })}
        age={54}
      />,
    );
    expect(screen.getByText(/Born Jul 30, 1970 \(age 54\)/)).toBeInTheDocument();
    expect(screen.getByText(/London, England, UK/)).toBeInTheDocument();
  });

  it("renders a birth–death span for a deceased person, not a misleading 'Born' line", () => {
    render(
      <PersonHeader person={person({ birthday: "1930-01-01", deathday: "2020-01-01" })} age={90} />,
    );
    expect(screen.getByText(/Jan 1, 1930 – Jan 1, 2020 \(age 90\)/)).toBeInTheDocument();
    expect(screen.queryByText(/^Born/)).not.toBeInTheDocument();
  });

  it("omits the personal-context line entirely when nothing is on file", () => {
    render(<PersonHeader person={person()} age={null} />);
    expect(screen.queryByText(/Born/)).not.toBeInTheDocument();
  });

  it("renders a fallback instead of an image when there's no profile photo", () => {
    render(<PersonHeader person={person({ profile: null })} age={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
