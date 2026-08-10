import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { PersonFilmographyEntry } from "@/server/people/types";
import { PersonFilmographyList } from "./person-filmography-list";

function entry(overrides: Partial<PersonFilmographyEntry> = {}): PersonFilmographyEntry {
  return {
    mediaType: "movie",
    mediaProviderId: 1,
    title: "Inception",
    poster: null,
    year: 2010,
    role: "acting",
    context: "Cobb",
    episodeCount: null,
    ...overrides,
  };
}

describe("PersonFilmographyList", () => {
  it("renders each entry as a link to its movie/show page", () => {
    render(
      <PersonFilmographyList
        entries={[
          entry({ mediaProviderId: 1, mediaType: "movie", title: "Inception" }),
          entry({ mediaProviderId: 2, mediaType: "show", title: "Peaky Blinders" }),
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: /Inception/ })).toHaveAttribute("href", "/movies/1");
    expect(screen.getByRole("link", { name: /Peaky Blinders/ })).toHaveAttribute(
      "href",
      "/shows/2",
    );
  });

  it("renders character context and episode count for a TV acting credit", () => {
    render(
      <PersonFilmographyList
        entries={[
          entry({
            mediaType: "show",
            title: "Peaky Blinders",
            context: "Alfie Solomons",
            episodeCount: 6,
          }),
        ]}
      />,
    );
    expect(screen.getByText("Alfie Solomons · 6 episodes")).toBeInTheDocument();
  });

  it("renders a media-type fallback icon instead of a broken image when the poster is missing", () => {
    render(<PersonFilmographyList entries={[entry({ poster: null })]} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows only the first 12 entries with a bounded 'Show more' reveal for a long career", async () => {
    const entries = Array.from({ length: 20 }, (_, i) =>
      entry({ mediaProviderId: i + 1, title: `Title ${i + 1}` }),
    );
    const user = userEvent.setup();
    render(<PersonFilmographyList entries={entries} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    const showMore = screen.getByRole("button", { name: "Show 8 more" });

    await user.click(showMore);

    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    expect(screen.queryByRole("button", { name: /Show/ })).not.toBeInTheDocument();
  });

  it("renders no 'Show more' control when everything already fits", () => {
    render(<PersonFilmographyList entries={[entry()]} />);
    expect(screen.queryByRole("button", { name: /Show/ })).not.toBeInTheDocument();
  });
});
