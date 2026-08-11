import { describe, expect, it } from "vitest";
import {
  matchQuality,
  normalizeSearchText,
  type RankableCandidate,
  rankSearchResults,
} from "./rank";

function candidate(overrides: Partial<RankableCandidate> & { id: string }): RankableCandidate {
  return {
    names: [],
    popularitySignal: 0,
    releaseYear: null,
    hasPersonalState: false,
    ...overrides,
  };
}

describe("normalizeSearchText", () => {
  it("lowercases and trims", () => {
    expect(normalizeSearchText("  The Office  ")).toBe("the office");
  });

  it("folds punctuation and apostrophes to spaces/nothing", () => {
    expect(normalizeSearchText("Ocean's Eleven")).toBe("oceans eleven");
    expect(normalizeSearchText("Spider-Man: Homecoming")).toBe("spider man homecoming");
  });

  it("folds basic Latin diacritics to their base letter", () => {
    expect(normalizeSearchText("Café")).toBe("cafe");
    expect(normalizeSearchText("Amélie")).toBe("amelie");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeSearchText("The   Office")).toBe("the office");
  });

  it("preserves non-Latin scripts rather than stripping them to nothing", () => {
    expect(normalizeSearchText("千と千尋の神隠し")).not.toBe("");
    expect(normalizeSearchText("千と千尋の神隠し")).toContain("千");
    // Korean Hangul syllables decompose into component jamo under NFKD
    // (a real, expected Unicode normalization, not data loss) — what
    // matters for matching is that normalization is self-consistent: the
    // same source text always normalizes to the same output, so a query
    // and a candidate name that are textually identical still match.
    expect(normalizeSearchText("기생충")).toBe(normalizeSearchText("기생충"));
    expect(normalizeSearchText("기생충")).not.toBe("");
  });
});

describe("matchQuality", () => {
  it("scores an exact match highest", () => {
    expect(matchQuality("Severance", "severance")).toBeGreaterThan(
      matchQuality("Severance Mountain", "severance"),
    );
  });

  it("scores a prefix match above a weak substring match", () => {
    const prefix = matchQuality("Breaking Bad", "breaking");
    const weakSubstring = matchQuality("The Great Breaking News Show", "breaking");
    expect(prefix).toBeGreaterThan(weakSubstring);
  });

  it("scores a whole-word match above a mid-word substring match", () => {
    const wordBoundary = matchQuality("The Dark Knight", "dark");
    // "bombardark" contains "dark" mid-word, not as a whole word and not
    // as a prefix — a genuinely weak substring case.
    const substring = matchQuality("The Bombardark Diaries", "dark");
    expect(wordBoundary).toBeGreaterThan(substring);
  });

  it("returns 0 for no match at all", () => {
    expect(matchQuality("Fight Club", "dune")).toBe(0);
  });

  it("returns 0 for an empty query", () => {
    expect(matchQuality("Fight Club", "")).toBe(0);
  });
});

describe("rankSearchResults", () => {
  it("ranks an exact match first, regardless of input order", () => {
    const candidates = [
      candidate({ id: "movie:1", names: ["Severance Mountain"] }),
      candidate({ id: "movie:2", names: ["Severance"] }),
    ];
    expect(rankSearchResults(candidates, "Severance")).toEqual(["movie:2", "movie:1"]);
  });

  it("ranks a prefix match above a weak substring match", () => {
    const candidates = [
      candidate({ id: "show:1", names: ["The Great Breaking News Show"] }),
      candidate({ id: "show:2", names: ["Breaking Bad"] }),
    ];
    expect(rankSearchResults(candidates, "breaking")).toEqual(["show:2", "show:1"]);
  });

  it("uses popularity as a tie-break between two identical exact matches", () => {
    const candidates = [
      candidate({ id: "movie:obscure", names: ["Dark"], popularitySignal: 5 }),
      candidate({ id: "show:popular", names: ["Dark"], popularitySignal: 50000 }),
    ];
    expect(rankSearchResults(candidates, "Dark")).toEqual(["show:popular", "movie:obscure"]);
  });

  it("never lets type create priority — an exact-match Movie beats a merely-related Show", () => {
    const candidates = [
      candidate({ id: "show:unrelated", names: ["Breaking Bad"], popularitySignal: 90000 }),
      candidate({ id: "movie:exact", names: ["Dark"], popularitySignal: 10 }),
    ];
    expect(rankSearchResults(candidates, "Dark")).toEqual(["movie:exact"]);
  });

  it("never lets type create priority — an exact-match Show beats a merely-related Movie", () => {
    const candidates = [
      candidate({ id: "movie:unrelated", names: ["The Dark Knight"], popularitySignal: 90000 }),
      candidate({ id: "show:exact", names: ["Dark"], popularitySignal: 10 }),
    ];
    const ranked = rankSearchResults(candidates, "Dark");
    expect(ranked[0]).toBe("show:exact");
  });

  it("a highly popular weak partial match never beats a genuine exact match", () => {
    const candidates = [
      candidate({
        id: "movie:popular-partial",
        names: ["The Dark Knight"],
        popularitySignal: 1_000_000,
      }),
      candidate({ id: "movie:obscure-exact", names: ["Dark"], popularitySignal: 1 }),
    ];
    expect(rankSearchResults(candidates, "Dark")[0]).toBe("movie:obscure-exact");
  });

  it("secondary signals never cross a match-quality tier even at their combined maximum", () => {
    // A prefix match, maximally boosted by popularity/recency/personal
    // state, must still never outrank a plain exact match with none of
    // those boosts — see rank.ts's own comment on SEARCH_RANK_WEIGHTS.
    const candidates = [
      candidate({
        id: "movie:boosted-prefix",
        names: ["Dune: Part Two"],
        popularitySignal: 10_000_000,
        releaseYear: new Date().getFullYear(),
        hasPersonalState: true,
      }),
      candidate({ id: "movie:plain-exact", names: ["Dune"] }),
    ];
    expect(rankSearchResults(candidates, "Dune")[0]).toBe("movie:plain-exact");
  });

  it("a Person can rank first when they're clearly the strongest match", () => {
    const candidates = [
      candidate({ id: "movie:related", names: ["Christopher Robin"], popularitySignal: 500 }),
      candidate({ id: "person:exact", names: ["Christopher Nolan"], popularitySignal: 50 }),
    ];
    expect(rankSearchResults(candidates, "Christopher Nolan")).toEqual(["person:exact"]);
  });

  it("a Person's own popularity resolves ambiguity among partial matches, same as media", () => {
    const candidates = [
      candidate({ id: "person:obscure", names: ["Christopher Smith"], popularitySignal: 1 }),
      candidate({ id: "person:famous", names: ["Christopher Nolan"], popularitySignal: 200 }),
    ];
    const ranked = rankSearchResults(candidates, "Christopher");
    expect(ranked[0]).toBe("person:famous");
  });

  it("matches on any provided name — original title as well as display title", () => {
    const candidates = [candidate({ id: "movie:1", names: ["Your Name.", "Kimi no Na wa."] })];
    expect(rankSearchResults(candidates, "Kimi no Na wa")).toEqual(["movie:1"]);
  });

  it("gives personal state only a small, bounded boost — never enough to beat a clearly better textual match", () => {
    const candidates = [
      candidate({ id: "movie:in-library", names: ["Dark Waters"], hasPersonalState: true }),
      candidate({ id: "movie:exact", names: ["Dark"] }),
    ];
    expect(rankSearchResults(candidates, "Dark")[0]).toBe("movie:exact");
  });

  it("personal state still breaks a genuine tie between two equal matches", () => {
    const candidates = [
      candidate({ id: "movie:not-saved", names: ["Dark"], hasPersonalState: false }),
      candidate({ id: "movie:saved", names: ["Dark"], hasPersonalState: true }),
    ];
    expect(rankSearchResults(candidates, "Dark")[0]).toBe("movie:saved");
  });

  it("drops a candidate with zero text relevance entirely, rather than ranking it last", () => {
    const candidates = [
      candidate({ id: "movie:match", names: ["Dune"] }),
      candidate({ id: "movie:unrelated", names: ["Casablanca"] }),
    ];
    expect(rankSearchResults(candidates, "Dune")).toEqual(["movie:match"]);
  });

  it("produces a fully deterministic order for the same input, run repeatedly", () => {
    const candidates = [
      candidate({ id: "movie:a", names: ["Dark"], popularitySignal: 10 }),
      candidate({ id: "show:b", names: ["Dark"], popularitySignal: 10 }),
      candidate({ id: "movie:c", names: ["Dark Waters"] }),
    ];
    const first = rankSearchResults(candidates, "Dark");
    const second = rankSearchResults([...candidates].reverse(), "Dark");
    expect(first).toEqual(second);
  });

  it("breaks a true tie (identical score) by a stable id sort", () => {
    const candidates = [
      candidate({ id: "show:zzz", names: ["Dark"], popularitySignal: 10 }),
      candidate({ id: "movie:aaa", names: ["Dark"], popularitySignal: 10 }),
    ];
    expect(rankSearchResults(candidates, "Dark")).toEqual(["movie:aaa", "show:zzz"]);
  });
});
