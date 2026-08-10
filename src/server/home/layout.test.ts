import { describe, expect, it } from "vitest";
import { resolveHomeLayout } from "./layout";

describe("resolveHomeLayout", () => {
  it("Balanced: personal first, every public section", () => {
    const layout = resolveHomeLayout("balanced");
    expect(layout.personalFirst).toBe(true);
    expect(layout.publicSections).toHaveLength(5);
  });

  it("Personal: personal first, fewer public sections — never zero", () => {
    const layout = resolveHomeLayout("personal");
    expect(layout.personalFirst).toBe(true);
    expect(layout.publicSections.length).toBeGreaterThan(0);
    expect(layout.publicSections.length).toBeLessThan(5);
  });

  it("Discovery: public sections lead, but personal sections are never dropped from the page", () => {
    const layout = resolveHomeLayout("discovery");
    expect(layout.personalFirst).toBe(false);
    expect(layout.publicSections).toHaveLength(5);
  });
});
