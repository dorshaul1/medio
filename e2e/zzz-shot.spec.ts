import { test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("shoot hero light desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/private/tmp/claude-502/-Users-dshaul-Desktop-streaming-management/9e99cd4a-a16e-4b77-a682-8e33c8ef4c5c/scratchpad/shots/hero-light-full.png" });
});

test("shoot hero dark desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/private/tmp/claude-502/-Users-dshaul-Desktop-streaming-management/9e99cd4a-a16e-4b77-a682-8e33c8ef4c5c/scratchpad/shots/hero-dark-full.png" });
});

test("shoot hero mobile dark", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/private/tmp/claude-502/-Users-dshaul-Desktop-streaming-management/9e99cd4a-a16e-4b77-a682-8e33c8ef4c5c/scratchpad/shots/hero-mobile-dark-full.png" });
});
