import { describe, expect, it } from "vitest";
import { mediaHref } from "./media-route";

describe("mediaHref", () => {
  it("builds a /movies/[id] URL for a movie", () => {
    expect(mediaHref({ mediaType: "movie", id: 550 })).toBe("/movies/550");
  });

  it("builds a /shows/[id] URL for a show", () => {
    expect(mediaHref({ mediaType: "show", id: 1399 })).toBe("/shows/1399");
  });
});
