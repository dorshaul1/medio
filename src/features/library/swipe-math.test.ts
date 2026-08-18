import { describe, expect, it } from "vitest";
import {
  clampSwipeTravel,
  isPastCommitThreshold,
  resolveSwipeIntent,
  SWIPE_MAX_TRAVEL_PX,
  swipeProgress,
} from "./swipe-math";

describe("resolveSwipeIntent", () => {
  it("stays pending for tiny jitter in either axis", () => {
    expect(resolveSwipeIntent(3, 2)).toBe("pending");
    expect(resolveSwipeIntent(-4, 5)).toBe("pending");
  });

  it("locks horizontal once horizontal movement clearly dominates", () => {
    expect(resolveSwipeIntent(-20, 2)).toBe("horizontal");
    expect(resolveSwipeIntent(-20, 5)).toBe("horizontal");
  });

  it("locks vertical once vertical movement clearly dominates, protecting page scroll", () => {
    expect(resolveSwipeIntent(2, -20)).toBe("vertical");
    expect(resolveSwipeIntent(5, 20)).toBe("vertical");
  });

  it("prefers vertical on an ambiguous diagonal drag — never mistakes a scroll for a swipe", () => {
    expect(resolveSwipeIntent(-14, 12)).toBe("vertical");
  });
});

describe("clampSwipeTravel", () => {
  it("ignores leftward drags entirely", () => {
    expect(clampSwipeTravel(-40)).toBe(0);
  });

  it("follows a rightward drag 1:1 up to the max travel", () => {
    expect(clampSwipeTravel(30)).toBe(30);
  });

  it("clamps at the reveal layer's own travel distance", () => {
    expect(clampSwipeTravel(500)).toBe(SWIPE_MAX_TRAVEL_PX);
  });
});

describe("swipeProgress / isPastCommitThreshold", () => {
  it("is 0 at rest and 1 at full travel", () => {
    expect(swipeProgress(0)).toBe(0);
    expect(swipeProgress(SWIPE_MAX_TRAVEL_PX)).toBe(1);
  });

  it("is not past threshold for a short drag", () => {
    const shortTravel = SWIPE_MAX_TRAVEL_PX * 0.3;
    expect(isPastCommitThreshold(shortTravel)).toBe(false);
  });

  it("is past threshold once the commit ratio is crossed", () => {
    const longTravel = SWIPE_MAX_TRAVEL_PX * 0.7;
    expect(isPastCommitThreshold(longTravel)).toBe(true);
  });
});
