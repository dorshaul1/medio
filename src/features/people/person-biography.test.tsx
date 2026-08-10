import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonBiography } from "./person-biography";

// jsdom never actually lays text out, so `scrollHeight`/`clientHeight`
// are always 0/0 by default — the same "measure real overflow" pattern
// this component uses can't be exercised without stubbing them, the
// established technique for this kind of layout-dependent assertion in
// this codebase.
function stubOverflow(overflowing: boolean) {
  Object.defineProperty(HTMLParagraphElement.prototype, "scrollHeight", {
    configurable: true,
    value: overflowing ? 200 : 100,
  });
  Object.defineProperty(HTMLParagraphElement.prototype, "clientHeight", {
    configurable: true,
    value: 100,
  });
}

describe("PersonBiography", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing at all when there's no biography — no 'unavailable' placeholder", () => {
    const { container } = render(<PersonBiography biography={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the biography text under a heading", () => {
    stubOverflow(false);
    render(<PersonBiography biography="A British-American filmmaker." />);
    expect(screen.getByRole("heading", { name: "Biography" })).toBeInTheDocument();
    expect(screen.getByText("A British-American filmmaker.")).toBeInTheDocument();
  });

  it("shows a Read more toggle only when the text actually overflows the clamp", () => {
    stubOverflow(false);
    render(<PersonBiography biography="A short bio." />);
    expect(screen.queryByRole("button", { name: "Read more" })).not.toBeInTheDocument();
  });

  it("expands the full biography and hides the toggle once activated", async () => {
    stubOverflow(true);
    const user = userEvent.setup();
    render(<PersonBiography biography="A long biography that overflows the clamp." />);

    const toggle = screen.getByRole("button", { name: "Read more" });
    await user.click(toggle);

    expect(screen.queryByRole("button", { name: "Read more" })).not.toBeInTheDocument();
  });
});
