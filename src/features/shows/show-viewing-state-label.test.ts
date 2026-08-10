import { describe, expect, it } from "vitest";
import { showViewingStateLabel } from "./show-viewing-state-label";

describe("showViewingStateLabel", () => {
  it("labels no explicit state + no history as Not started", () => {
    expect(showViewingStateLabel(null, "unwatched")).toBe("Not started");
  });

  it("labels an explicit watching state with no history yet as Watching, not Not started", () => {
    expect(showViewingStateLabel("watching", "unwatched")).toBe("Watching");
  });

  it("labels watching", () => {
    expect(showViewingStateLabel("watching", "watching")).toBe("Watching");
  });

  it("labels on_hold", () => {
    expect(showViewingStateLabel("on_hold", "on_hold")).toBe("On hold");
  });

  it("labels dropped", () => {
    expect(showViewingStateLabel("dropped", "dropped")).toBe("Dropped");
  });

  it("labels caught_up", () => {
    expect(showViewingStateLabel("watching", "caught_up")).toBe("Caught up");
  });

  it("labels waiting", () => {
    expect(showViewingStateLabel("watching", "waiting")).toBe("Waiting");
  });

  it("labels completed", () => {
    expect(showViewingStateLabel("watching", "completed")).toBe("Completed");
  });
});
