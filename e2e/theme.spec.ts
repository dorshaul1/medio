import { expect, test } from "@playwright/test";

test("theme preference switches and persists across reload", async ({ page }) => {
  await page.goto("/");

  const toggle = page.getByRole("button", { name: /theme:/i });
  await expect(toggle).toBeVisible();

  // The toggle cycles light -> dark -> system -> light; walk forward from
  // whatever the resolved starting preference is to a known target (dark)
  // with an exact, deterministic number of clicks — no arbitrary waits.
  const initialLabel = await toggle.getAttribute("aria-label");
  const clicksToDark = initialLabel?.includes("Theme: Dark")
    ? 0
    : initialLabel?.includes("Theme: Light")
      ? 1
      : 2;

  for (let i = 0; i < clicksToDark; i++) {
    await toggle.click();
  }

  await expect(toggle).toHaveAttribute("aria-label", /theme: dark/i);
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: /theme: dark/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
});
