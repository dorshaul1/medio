import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "./calendar";

describe("Calendar", () => {
  it("renders the visible month, defaulting to the selected date's month", () => {
    render(<Calendar selected={new Date(2024, 2, 15)} onSelect={vi.fn()} />);
    expect(screen.getByText("March 2024")).toBeInTheDocument();
  });

  it("marks the selected day as pressed", () => {
    render(<Calendar selected={new Date(2024, 2, 15)} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "15" })).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect with the clicked date — selecting a day is the action, no separate confirm step", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Calendar selected={new Date(2024, 2, 1)} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "15" }));

    expect(onSelect).toHaveBeenCalledWith(new Date(2024, 2, 15));
  });

  it("navigates to the previous/next month", async () => {
    const user = userEvent.setup();
    render(<Calendar selected={new Date(2024, 2, 1)} onSelect={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("April 2024")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("February 2024")).toBeInTheDocument();
  });

  it("disables dates after maxDate", () => {
    render(
      <Calendar
        selected={new Date(2024, 2, 10)}
        onSelect={vi.fn()}
        maxDate={new Date(2024, 2, 15)}
      />,
    );
    expect(screen.getByRole("button", { name: "20" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "10" })).not.toBeDisabled();
  });

  it("disables navigating past maxDate's month", () => {
    render(
      <Calendar
        selected={new Date(2024, 2, 10)}
        onSelect={vi.fn()}
        maxDate={new Date(2024, 2, 15)}
      />,
    );
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });
});
