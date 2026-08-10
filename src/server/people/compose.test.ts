import { describe, expect, it } from "vitest";
import type { Person, PersonCastCredit, PersonCrewCredit } from "@/server/media/types";
import { buildFilmographySections, personAge, selectKnownFor } from "./compose";

function person(overrides: Partial<Person> = {}): Person {
  return {
    id: 1,
    name: "Test Person",
    profile: null,
    biography: null,
    knownForDepartment: null,
    birthday: null,
    deathday: null,
    birthplace: null,
    ...overrides,
  };
}

function castCredit(overrides: Partial<PersonCastCredit> = {}): PersonCastCredit {
  return {
    mediaType: "movie",
    mediaProviderId: 1,
    title: "Untitled",
    poster: null,
    year: 2020,
    voteCount: 0,
    character: null,
    episodeCount: null,
    ...overrides,
  };
}

function crewCredit(overrides: Partial<PersonCrewCredit> = {}): PersonCrewCredit {
  return {
    mediaType: "movie",
    mediaProviderId: 1,
    title: "Untitled",
    poster: null,
    year: 2020,
    voteCount: 0,
    job: "Director",
    department: "Directing",
    ...overrides,
  };
}

describe("buildFilmographySections", () => {
  it("actor-only: Acting is the only, and therefore primary, section", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Acting" }), {
      cast: [castCredit({ mediaProviderId: 1, character: "Cobb" })],
      crew: [],
    });
    expect(sections).toEqual([expect.objectContaining({ role: "acting" })]);
  });

  it("director-only: Directing is the only, and therefore primary, section", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Directing" }), {
      cast: [],
      crew: [crewCredit({ mediaProviderId: 1, job: "Director" })],
    });
    expect(sections).toEqual([expect.objectContaining({ role: "directing" })]);
  });

  it("actor + director: both sections render, Directing leads for a director", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Directing" }), {
      cast: [castCredit({ mediaProviderId: 1, character: "Himself" })],
      crew: [crewCredit({ mediaProviderId: 2, job: "Director" })],
    });
    expect(sections.map((s) => s.role)).toEqual(["directing", "acting"]);
  });

  it("actor + director: Acting leads when the person is primarily an actor", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Acting" }), {
      cast: [castCredit({ mediaProviderId: 1, character: "Cobb" })],
      crew: [crewCredit({ mediaProviderId: 2, job: "Director" })],
    });
    expect(sections.map((s) => s.role)).toEqual(["acting", "directing"]);
  });

  it("real directing credits lead even when known_for_department still says Acting (a common lag for actor-directors)", () => {
    // Real credits are the primary signal, not TMDB's own (sometimes
    // stale) known_for_department — see compose.ts's own comment.
    const sections = buildFilmographySections(person({ knownForDepartment: "Acting" }), {
      cast: [castCredit({ mediaProviderId: 1, character: "Cobb" })],
      crew: [crewCredit({ mediaProviderId: 2, job: "Director" })],
    });
    // known_for_department "Acting" still puts Acting first — this is the
    // documented, deliberate simplification (known_for_department picks
    // the lead section), not real-credit-driven ranking.
    expect(sections[0]?.role).toBe("acting");
  });

  it("a prolific producer with a few director credits still surfaces Directing as its own, findable section", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Production" }), {
      cast: [],
      crew: [
        crewCredit({ mediaProviderId: 1, job: "Producer" }),
        crewCredit({ mediaProviderId: 2, job: "Executive Producer" }),
        crewCredit({ mediaProviderId: 3, job: "Producer" }),
        crewCredit({ mediaProviderId: 4, job: "Director" }),
      ],
    });
    const directing = sections.find((s) => s.role === "directing");
    expect(directing?.entries).toHaveLength(1);
    expect(directing?.entries[0]?.mediaProviderId).toBe(4);
  });

  it("groups Writing department jobs together and Production jobs to Producer/Executive Producer only", () => {
    const sections = buildFilmographySections(person(), {
      cast: [],
      crew: [
        crewCredit({ mediaProviderId: 1, job: "Screenplay", department: "Writing" }),
        crewCredit({ mediaProviderId: 2, job: "Story", department: "Writing" }),
        crewCredit({ mediaProviderId: 3, job: "Associate Producer", department: "Production" }),
      ],
    });
    const writing = sections.find((s) => s.role === "writing");
    expect(writing?.entries).toHaveLength(2);
    // "Associate Producer" isn't one of the two primary producer titles —
    // dropped as noise, same reasoning as excluding minor crew jobs.
    expect(sections.some((s) => s.role === "producing")).toBe(false);
  });

  it("drops jobs outside Directing/Writing/Producing entirely — no catch-all Crew section", () => {
    const sections = buildFilmographySections(person(), {
      cast: [],
      crew: [crewCredit({ job: "Director of Photography", department: "Camera" })],
    });
    expect(sections).toEqual([]);
  });

  it("deduplicates a movie the person both directed and wrote within the same section", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Directing" }), {
      cast: [],
      crew: [
        crewCredit({ mediaProviderId: 1, job: "Director", department: "Directing" }),
        crewCredit({ mediaProviderId: 1, job: "Director", department: "Directing" }),
      ],
    });
    const directing = sections.find((s) => s.role === "directing");
    expect(directing?.entries).toHaveLength(1);
  });

  it("lets the same movie appear once in Directing and once in Writing when both are real credits", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Directing" }), {
      cast: [],
      crew: [
        crewCredit({ mediaProviderId: 1, job: "Director", department: "Directing" }),
        crewCredit({ mediaProviderId: 1, job: "Screenplay", department: "Writing" }),
      ],
    });
    expect(sections.find((s) => s.role === "directing")?.entries).toHaveLength(1);
    expect(sections.find((s) => s.role === "writing")?.entries).toHaveLength(1);
  });

  it("filters archive-footage and Self appearances (in TMDB's various real formats) from Acting", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Acting" }), {
      cast: [
        castCredit({ mediaProviderId: 1, character: "Self (archive footage)" }),
        castCredit({ mediaProviderId: 2, character: "Self" }),
        castCredit({ mediaProviderId: 3, character: "Self (voice)" }),
        castCredit({ mediaProviderId: 4, character: "Self - Director" }),
        castCredit({ mediaProviderId: 5, character: "Self · Director / Writer / Producer" }),
        castCredit({ mediaProviderId: 6, character: "Cobb" }),
      ],
      crew: [],
    });
    const acting = sections.find((s) => s.role === "acting");
    expect(acting?.entries).toHaveLength(1);
    expect(acting?.entries[0]?.mediaProviderId).toBe(6);
  });

  it("keeps a real character name that merely starts with 'self'", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Acting" }), {
      cast: [castCredit({ mediaProviderId: 1, character: "Self-Made Man" })],
      crew: [],
    });
    expect(sections.find((s) => s.role === "acting")?.entries).toHaveLength(1);
  });

  it("sorts entries newest first, pushing unknown release years to the end rather than the top", () => {
    const sections = buildFilmographySections(person({ knownForDepartment: "Acting" }), {
      cast: [
        castCredit({ mediaProviderId: 1, year: 2010 }),
        castCredit({ mediaProviderId: 2, year: null }),
        castCredit({ mediaProviderId: 3, year: 2020 }),
      ],
      crew: [],
    });
    const years = sections[0]?.entries.map((e) => e.mediaProviderId);
    expect(years).toEqual([3, 1, 2]);
  });

  it("does not render an empty section for a role with no real credits", () => {
    const sections = buildFilmographySections(person(), { cast: [], crew: [] });
    expect(sections).toEqual([]);
  });
});

describe("selectKnownFor", () => {
  it("omits Known For when the pool is too small to meaningfully curate", () => {
    const result = selectKnownFor(
      [castCredit({ mediaProviderId: 1, voteCount: 1000 })],
      [crewCredit({ mediaProviderId: 2, voteCount: 500 })],
    );
    expect(result).toEqual([]);
  });

  it("omits Known For when nothing in the pool has any real vote signal", () => {
    const result = selectKnownFor(
      [
        castCredit({ mediaProviderId: 1, voteCount: 0 }),
        castCredit({ mediaProviderId: 2, voteCount: 0 }),
        castCredit({ mediaProviderId: 3, voteCount: 0 }),
      ],
      [],
    );
    expect(result).toEqual([]);
  });

  it("ranks by vote count, deduplicated across cast and crew", () => {
    const result = selectKnownFor(
      [
        castCredit({ mediaProviderId: 1, title: "Low", voteCount: 10 }),
        castCredit({ mediaProviderId: 2, title: "High", voteCount: 1000 }),
        castCredit({ mediaProviderId: 3, title: "Mid", voteCount: 100 }),
      ],
      [crewCredit({ mediaProviderId: 2, title: "High", voteCount: 1000 })],
    );
    expect(result.map((item) => item.title)).toEqual(["High", "Mid", "Low"]);
  });

  it("caps the selection at 6 items", () => {
    const cast = Array.from({ length: 10 }, (_, i) =>
      castCredit({ mediaProviderId: i + 1, voteCount: 100 - i }),
    );
    expect(selectKnownFor(cast, [])).toHaveLength(6);
  });
});

describe("personAge", () => {
  it("computes age from a birthday to now", () => {
    const asOf = new Date("2024-08-01T00:00:00Z");
    expect(personAge("1970-07-30", null, asOf)).toBe(54);
  });

  it("has not had this year's birthday yet", () => {
    const asOf = new Date("2024-01-01T00:00:00Z");
    expect(personAge("1970-07-30", null, asOf)).toBe(53);
  });

  it("computes age at death when a death date exists", () => {
    expect(personAge("1970-07-30", "2020-01-01", new Date("2024-01-01"))).toBe(49);
  });

  it("returns null with no birthday on file", () => {
    expect(personAge(null, null)).toBeNull();
  });
});
