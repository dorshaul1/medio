import { describe, expect, it } from "vitest";
import { resolveHomeLayout } from "./layout";

describe("resolveHomeLayout", () => {
  it("Balanced: continuation rows + a calendar preview + a restrained amount of discovery, no Backlog row", () => {
    const layout = resolveHomeLayout("balanced");
    expect(layout.showContinuationRows).toBe(true);
    expect(layout.publicSections.length).toBeGreaterThan(0);
    expect(layout.publicSections.length).toBeLessThan(5);
    expect(layout.calendarAgendaSize).toBe("preview");
    expect(layout.showBacklogRow).toBe(false);
  });

  it("Personal: continuation rows + a Backlog row, discovery reduced below Balanced's, no calendar agenda", () => {
    const balanced = resolveHomeLayout("balanced");
    const layout = resolveHomeLayout("personal");
    expect(layout.showContinuationRows).toBe(true);
    expect(layout.showBacklogRow).toBe(true);
    expect(layout.calendarAgendaSize).toBe("none");
    expect(layout.publicSections.length).toBeGreaterThan(0);
    expect(layout.publicSections.length).toBeLessThan(balanced.publicSections.length);
  });

  it("Calendar: the full agenda only — no continuation rows, no Backlog row, zero discovery", () => {
    const layout = resolveHomeLayout("calendar");
    expect(layout.showContinuationRows).toBe(false);
    expect(layout.calendarAgendaSize).toBe("full");
    expect(layout.publicSections).toHaveLength(0);
    expect(layout.showBacklogRow).toBe(false);
  });

  it("never encodes Up Next — the resolved composition has no such field", () => {
    const layout = resolveHomeLayout("calendar");
    expect(layout).not.toHaveProperty("showUpNext");
    expect(layout).not.toHaveProperty("upNext");
  });

  it("every layout's composition is distinct from every other layout's", () => {
    const modes = (["balanced", "personal", "calendar"] as const).map((mode) =>
      JSON.stringify(resolveHomeLayout(mode)),
    );
    expect(new Set(modes).size).toBe(modes.length);
  });
});
