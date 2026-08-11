import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "./landing-page";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

// `InstallProvider` lives in the root layout, not `LandingPage` itself
// (see docs/pwa.md, "Shared install domain") — mocked here the same way
// `install-app-setting.test.tsx` mocks it, defaulting to desktop
// ("not-promoted") so most tests never need to think about it, with
// individual tests below overriding it to exercise the mobile states.
const useInstall = vi.fn().mockReturnValue({
  state: { kind: "not-promoted" },
  promptInstall: vi.fn(),
});
vi.mock("@/features/install/install-provider", () => ({
  useInstall: () => useInstall(),
}));

beforeEach(() => {
  useInstall.mockReturnValue({ state: { kind: "not-promoted" }, promptInstall: vi.fn() });
});

describe("LandingPage", () => {
  it("shows the MEDIO brand and a clear one-sentence value proposition, with exactly one H1", () => {
    render(<LandingPage />);
    expect(screen.getAllByText("MEDIO").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: /Everything you watch/ }),
    ).toBeInTheDocument();
  });

  it("shows Pick for Me as a distinct, flagship section", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: /Stop wondering what to watch/ }),
    ).toBeInTheDocument();
  });

  it("covers the full product narrative — tracking, library, what's next, and history", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /Never lose your place/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /library that actually helps/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Always know what.s next/ })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /more yours the more you watch/ }),
    ).toBeInTheDocument();
  });

  it("never displays a literal Save → Watch → Track arrow diagram", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/Save.*Watch.*Track.*Understand.*Pick/)).not.toBeInTheDocument();
  });

  it("Get started links to Sign Up and Log in links to Sign In", () => {
    render(<LandingPage />);
    const getStartedLinks = screen.getAllByRole("link", { name: "Get started" });
    expect(getStartedLinks.length).toBeGreaterThan(0);
    for (const link of getStartedLinks) {
      expect(link).toHaveAttribute("href", "/sign-up");
    }
    const logInLinks = screen.getAllByRole("link", { name: "Log in" });
    expect(logInLinks.length).toBeGreaterThan(0);
    for (const link of logInLinks) {
      expect(link).toHaveAttribute("href", "/sign-in");
    }
  });

  it("never mentions AI or scoring internals for Pick for Me", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/AI-powered/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/algorithm|scoring/i)).not.toBeInTheDocument();
  });

  it("never fabricates marketing claims like fake user counts or testimonials", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/\d[\d,]* (users|members|subscribers)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/★|⭐/)).not.toBeInTheDocument();
  });

  it("never mentions pricing", () => {
    render(<LandingPage />);
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pricing|subscription|free trial/i)).not.toBeInTheDocument();
  });

  it("never uses generic SaaS marketing language", () => {
    render(<LandingPage />);
    const body = document.body.textContent ?? "";
    for (const phrase of ["seamless", "elevate", "revolutioniz", "unlock", "ultimate"]) {
      expect(body.toLowerCase()).not.toContain(phrase);
    }
  });

  it("the Tracking demo genuinely advances episode progress on click", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<LandingPage />);

    expect(screen.getByText("Episode 6")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mark watched" }));
    expect(screen.getByText("Episode 8")).toBeInTheDocument();
  });

  it("the Library demo genuinely switches state on click", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<LandingPage />);

    expect(screen.getByText("Interested")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Backlog" }));
    expect(screen.getByText("Actually plan to watch")).toBeInTheDocument();
  });

  it("the Pick for Me demo genuinely swaps the Best Pick by time context", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<LandingPage />);

    expect(screen.getByText("You're one episode from finishing it.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Movie night" }));
    expect(screen.getByText("A two-hour movie that fits tonight.")).toBeInTheDocument();
  });

  describe("mobile install story", () => {
    it("always tells the Home Screen story, even on desktop where there's no install action", () => {
      render(<LandingPage />);
      expect(screen.getByRole("heading", { name: /MEDIO, one tap away/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Install MEDIO" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Add to Home Screen" })).not.toBeInTheDocument();
    });

    it("offers a real Install MEDIO action once the mobile install domain says it's available", () => {
      useInstall.mockReturnValue({ state: { kind: "direct" }, promptInstall: vi.fn() });
      render(<LandingPage />);
      expect(screen.getByRole("button", { name: "Install MEDIO" })).toBeInTheDocument();
    });

    it("offers Add to Home Screen instructions on iOS Safari instead of a direct prompt", () => {
      useInstall.mockReturnValue({ state: { kind: "manual" }, promptInstall: vi.fn() });
      render(<LandingPage />);
      expect(screen.getByRole("button", { name: "Add to Home Screen" })).toBeInTheDocument();
    });

    it("never shows an install action once already installed", () => {
      useInstall.mockReturnValue({ state: { kind: "installed" }, promptInstall: vi.fn() });
      render(<LandingPage />);
      expect(screen.queryByRole("button", { name: "Install MEDIO" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Add to Home Screen" })).not.toBeInTheDocument();
    });

    it("never shows a generic app-store-marketing CTA like Download", () => {
      render(<LandingPage />);
      expect(screen.queryByText(/download/i)).not.toBeInTheDocument();
    });
  });
});
