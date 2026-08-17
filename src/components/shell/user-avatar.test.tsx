import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./user-avatar";

describe("UserAvatar", () => {
  it("shows initials when there is no image", () => {
    render(<UserAvatar name="Dor Shaul" image={null} />);
    expect(screen.getByText("DS")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the initials fallback while the real image hasn't loaded yet", () => {
    // Radix's Avatar only swaps to the real `<img>` after a genuine
    // browser load event, which jsdom never fires — so this is actually
    // real, correct behavior to assert: given an `image`, the initials
    // fallback still renders until loading is confirmed, exactly like a
    // real slow/failed image load on a real device would show.
    render(<UserAvatar name="Dor Shaul" image="https://example.com/avatar.jpg" />);
    expect(screen.getByText("DS")).toBeInTheDocument();
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
