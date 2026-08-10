import { describe, expect, it } from "vitest";
import { backdropUrl, posterUrl, stillUrl } from "./images";

describe("posterUrl", () => {
  it("builds a full URL for each semantic size", () => {
    const image = { path: "/abc123.jpg" };
    expect(posterUrl(image, "small")).toBe("https://image.tmdb.org/t/p/w154/abc123.jpg");
    expect(posterUrl(image, "medium")).toBe("https://image.tmdb.org/t/p/w342/abc123.jpg");
    expect(posterUrl(image, "large")).toBe("https://image.tmdb.org/t/p/w500/abc123.jpg");
  });

  it("returns null for a missing image rather than a broken URL", () => {
    expect(posterUrl(null, "medium")).toBeNull();
  });
});

describe("backdropUrl", () => {
  it("builds a full URL for each semantic size", () => {
    const image = { path: "/xyz789.jpg" };
    expect(backdropUrl(image, "medium")).toBe("https://image.tmdb.org/t/p/w780/xyz789.jpg");
    expect(backdropUrl(image, "large")).toBe("https://image.tmdb.org/t/p/w1280/xyz789.jpg");
  });

  it("returns null for a missing image", () => {
    expect(backdropUrl(null, "large")).toBeNull();
  });
});

describe("stillUrl", () => {
  it("builds a full URL, defaulting to the medium size", () => {
    expect(stillUrl({ path: "/still.jpg" })).toBe("https://image.tmdb.org/t/p/w300/still.jpg");
  });

  it("returns null for a missing image", () => {
    expect(stillUrl(null)).toBeNull();
  });
});
