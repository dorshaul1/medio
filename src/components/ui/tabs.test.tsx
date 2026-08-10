import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function renderTabs() {
  return render(
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="episodes">Episodes</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Overview content</TabsContent>
      <TabsContent value="episodes">Episodes content</TabsContent>
    </Tabs>,
  );
}

describe("Tabs", () => {
  it("exposes the default tab as selected and shows its panel", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Overview content")).toBeInTheDocument();
  });

  it("switches selection and panel when another tab is activated", async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole("tab", { name: "Episodes" }));

    expect(screen.getByRole("tab", { name: "Episodes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Episodes content")).toBeInTheDocument();
  });
});
