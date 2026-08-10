import { describe, expect, it } from "vitest";
import { pluralize } from "./pluralize";

describe("pluralize", () => {
  it("keeps the singular form for a count of 1", () => {
    expect(pluralize(1, "season")).toBe("1 season");
  });

  it("pluralizes for any other count", () => {
    expect(pluralize(4, "season")).toBe("4 seasons");
    expect(pluralize(0, "episode")).toBe("0 episodes");
  });
});
