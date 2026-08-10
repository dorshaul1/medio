import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CastMember } from "@/server/media/types";
import { CastMemberTile } from "./cast-member-tile";

const MEMBER: CastMember = {
  id: 819,
  name: "Edward Norton",
  character: "The Narrator",
  profile: { path: "/edward.jpg" },
};

describe("CastMemberTile", () => {
  it("renders the actor's name and character", () => {
    render(<CastMemberTile member={MEMBER} />);

    expect(screen.getByText("Edward Norton")).toBeInTheDocument();
    expect(screen.getByText("The Narrator")).toBeInTheDocument();
  });

  it("links to the actor's person page", () => {
    render(<CastMemberTile member={MEMBER} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/people/819");
  });

  it("renders a fallback instead of an image when there's no profile photo", () => {
    render(<CastMemberTile member={{ ...MEMBER, profile: null }} />);

    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
    expect(screen.getByText("Edward Norton")).toBeInTheDocument();
  });
});
