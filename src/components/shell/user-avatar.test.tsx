import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./user-avatar";

describe("UserAvatar", () => {
  it("shows initials when there is no image", () => {
    render(<UserAvatar name="Dor Shaul" image={null} />);
    expect(screen.getByText("DS")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the real image element with the correct source when one exists", () => {
    render(<UserAvatar name="Dor Shaul" image="https://example.com/avatar.jpg" />);
    // Radix's Avatar only swaps to the loaded image after a real browser
    // load event, which jsdom never fires — asserting the `<img>` itself
    // is wired to the right `src` (decorative `alt=""`, never a second
    // identity announcement) is the meaningful, jsdom-safe check here.
    const image = document.querySelector('img[src="https://example.com/avatar.jpg"]');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute("alt", "");
  });

  it("falls back to initials gracefully for a name with no letters to speak of", () => {
    render(<UserAvatar name="" image={null} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("never breaks layout for a very long name", () => {
    const { container } = render(
      <UserAvatar name="Dor Alexander Benjamin Christopher David Shaul" image={null} />,
    );
    expect(screen.getByText("DS")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="avatar"]')).toHaveClass("overflow-hidden");
  });
});
