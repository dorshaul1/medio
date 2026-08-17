import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

const { revalidateTrackingSurfaces } = await import("./revalidate-tracking-surfaces");

describe("revalidateTrackingSurfaces", () => {
  it("always revalidates Home, Calendar, Library, Stats (Overview + Taste), and Pick", () => {
    revalidatePath.mockClear();
    revalidateTrackingSurfaces({ affectsDiary: false });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/calendar");
    expect(revalidatePath).toHaveBeenCalledWith("/library");
    expect(revalidatePath).toHaveBeenCalledWith("/stats");
    expect(revalidatePath).toHaveBeenCalledWith("/pick");
  });

  it("never revalidates Diary unless affectsDiary is true", () => {
    revalidatePath.mockClear();
    revalidateTrackingSurfaces({ affectsDiary: false });
    expect(revalidatePath).not.toHaveBeenCalledWith("/library/diary");

    revalidatePath.mockClear();
    revalidateTrackingSurfaces({ affectsDiary: true });
    expect(revalidatePath).toHaveBeenCalledWith("/library/diary");
  });

  it("revalidates the movie's own page when movieProviderId is given", () => {
    revalidatePath.mockClear();
    revalidateTrackingSurfaces({ movieProviderId: 550, affectsDiary: false });
    expect(revalidatePath).toHaveBeenCalledWith("/movies/550");
  });

  it("revalidates the show's own page and every given season page", () => {
    revalidatePath.mockClear();
    revalidateTrackingSurfaces({
      showProviderId: 1399,
      seasonNumbers: [1, 2],
      affectsDiary: false,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/shows/1399");
    expect(revalidatePath).toHaveBeenCalledWith("/shows/1399/seasons/1");
    expect(revalidatePath).toHaveBeenCalledWith("/shows/1399/seasons/2");
  });

  it("touches neither movie nor show pages when neither id is given", () => {
    revalidatePath.mockClear();
    revalidateTrackingSurfaces({ affectsDiary: false });
    const paths = revalidatePath.mock.calls.map((call) => call[0]);
    expect(paths.some((path) => path.startsWith("/movies/") || path.startsWith("/shows/"))).toBe(
      false,
    );
  });
});
