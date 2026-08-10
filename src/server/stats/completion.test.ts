import { describe, expect, it } from "vitest";
import { computeCompletionInsight } from "./completion";

describe("computeCompletionInsight", () => {
  it("returns null below the minimum tracked-show sample", () => {
    expect(computeCompletionInsight({ watching: 1, onHold: 0, dropped: 1 })).toBeNull();
  });

  it("reports 'finishes' when the dropped ratio is low", () => {
    const insight = computeCompletionInsight({ watching: 9, onHold: 0, dropped: 0 });
    expect(insight?.tendency).toBe("finishes");
    expect(insight?.trackedShowCount).toBe(9);
  });

  it("reports 'explores' when the dropped ratio is high, never a shaming label", () => {
    const insight = computeCompletionInsight({ watching: 1, onHold: 1, dropped: 3 });
    expect(insight?.tendency).toBe("explores");
    expect(insight?.droppedShowCount).toBe(3);
  });

  it("never relies on a stale persisted 'completed' status — inputs are explicit counts only", () => {
    const insight = computeCompletionInsight({ watching: 2, onHold: 2, dropped: 0 });
    expect(insight?.tendency).toBe("finishes");
  });
});
