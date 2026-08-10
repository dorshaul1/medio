import { afterEach, describe, expect, it, vi } from "vitest";
import { mapAuthError } from "./auth-errors";

describe("mapAuthError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps known error codes to user-facing copy and the affected field(s)", () => {
    expect(mapAuthError("PASSWORD_TOO_SHORT")).toMatchObject({
      message: "Password must be at least 8 characters.",
      fields: ["password"],
    });
    expect(mapAuthError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")).toMatchObject({
      message: "An account with this email already exists.",
      fields: ["email"],
    });
  });

  it("marks both email and password invalid for invalid sign-in credentials, to avoid revealing which one was wrong", () => {
    expect(mapAuthError("INVALID_EMAIL_OR_PASSWORD").fields).toEqual(["email", "password"]);
  });

  it("falls back to a generic, non-leaking message with no field for unknown codes", () => {
    expect(mapAuthError("SOME_INTERNAL_DATABASE_ERROR")).toMatchObject({
      message: "Something went wrong. Please try again.",
      fields: [],
    });
  });

  it("falls back for a missing code", () => {
    expect(mapAuthError(undefined)).toMatchObject({
      message: "Something went wrong. Please try again.",
      fields: [],
    });
  });

  it("shows a clean 'internal server error' message for a 500 — a raw server crash, not a Better Auth validation error", () => {
    expect(
      mapAuthError(undefined, { status: 500, message: 'relation "user" does not exist' }),
    ).toMatchObject({
      message: "Internal server error. Please try again in a moment.",
      fields: [],
    });
  });

  it("never leaks raw error detail into the returned value", () => {
    const result = mapAuthError("SOME_INTERNAL_DATABASE_ERROR", {
      status: 500,
      message: "relation does not exist",
    });
    expect(result).toEqual({
      message: "Internal server error. Please try again in a moment.",
      fields: [],
    });
  });
});
