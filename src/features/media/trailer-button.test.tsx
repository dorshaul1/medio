import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Trailer } from "@/server/media/types";
import { TrailerButton } from "./trailer-button";

const TRAILER: Trailer = { key: "SUXWAEX2jlg", name: "Official Trailer" };

describe("TrailerButton", () => {
  it("doesn't load the video until the trigger is activated — no autoplay/preload", () => {
    render(<TrailerButton trailer={TRAILER} title="Inception" />);

    expect(document.querySelector("iframe")).not.toBeInTheDocument();
  });

  it("opens a dialog with the trailer embedded, without an autoplay param, on activation", async () => {
    const user = userEvent.setup();
    render(<TrailerButton trailer={TRAILER} title="Inception" />);

    await user.click(screen.getByRole("button", { name: "Play trailer" }));

    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", expect.stringContaining(TRAILER.key));
    expect(iframe?.getAttribute("src")).not.toContain("autoplay");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
