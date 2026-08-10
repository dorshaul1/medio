import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthScreen } from "./auth-screen";

describe("AuthScreen", () => {
  it("shows the MEDIO brand mark linking back to the public Landing page", () => {
    render(
      <AuthScreen title="Sign in" tagline="Welcome back." footer={null}>
        <p>form</p>
      </AuthScreen>,
    );
    expect(screen.getByRole("link", { name: "MEDIO" })).toHaveAttribute("href", "/");
  });

  it("renders the screen title as a real heading, not styled text alone", () => {
    render(
      <AuthScreen title="Create account" tagline="Track what you watch." footer={null}>
        <p>form</p>
      </AuthScreen>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Create account" })).toBeInTheDocument();
  });
});
