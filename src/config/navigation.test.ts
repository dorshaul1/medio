import { describe, expect, it } from "vitest";
import { isNavItemActive } from "./navigation";

describe("isNavItemActive", () => {
  it("matches a flat destination exactly", () => {
    expect(isNavItemActive("/discover", "/discover")).toBe(true);
    expect(isNavItemActive("/library", "/discover")).toBe(false);
  });

  it("treats a genre browse page as still within Discover", () => {
    expect(isNavItemActive("/discover/movies/genre/comedy", "/discover")).toBe(true);
    expect(isNavItemActive("/discover/shows/genre/drama", "/discover")).toBe(true);
  });

  it("never treats '/' as a prefix of every other route", () => {
    expect(isNavItemActive("/discover", "/")).toBe(false);
    expect(isNavItemActive("/", "/")).toBe(true);
  });

  it("doesn't false-positive on a route that merely starts with the same characters", () => {
    expect(isNavItemActive("/discovery-settings", "/discover")).toBe(false);
  });
});
