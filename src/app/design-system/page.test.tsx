import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DesignSystemPage from "./page";

describe("DesignSystemPage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders the internal reference heading outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    render(<DesignSystemPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Design System" })).toBeInTheDocument();
  });

  it("calls notFound instead of rendering in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => render(<DesignSystemPage />)).toThrow();
  });
});
