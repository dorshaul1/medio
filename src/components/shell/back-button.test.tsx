import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }) }));

const { BackButton } = await import("./back-button");

describe("BackButton", () => {
  it("navigates back through browser history when activated", async () => {
    const user = userEvent.setup();
    render(<BackButton />);

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(back).toHaveBeenCalledOnce();
  });
});
