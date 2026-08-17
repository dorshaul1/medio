import { expect, test } from "@playwright/test";

// Always runs against a real production build (see playwright.config.ts
// — `pnpm build && pnpm start`), so the Service Worker (registered only
// in production, see `src/components/pwa-manager.tsx`) is genuinely
// active for every test in this file, not just a dev-mode approximation.

test("the manifest and app icons are served with real, correct content", async ({ page }) => {
  const response = await page.goto("/manifest.webmanifest");
  expect(response?.status()).toBe(200);
  const manifest = await response?.json();
  expect(manifest.name).toBe("MEDIO");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
  );

  for (const icon of manifest.icons) {
    const iconResponse = await page.request.get(icon.src);
    expect(iconResponse.status()).toBe(200);
    expect(iconResponse.headers()["content-type"]).toBe("image/png");
  }
});

test("the root document links the manifest and an apple-touch-icon", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test.describe("mobile browser experience", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sticky header, Search, and bottom navigation all work at a phone width", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

    await page.getByRole("button", { name: "Search Movies, Shows and People" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Header stays reachable after scrolling a long route.
    await page.goto("/library");
    await page.mouse.wheel(0, 800);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeInViewport();
  });
});

test.describe("offline behavior", () => {
  test("shows a polished offline page when navigation fails, and recovers once back online", async ({
    page,
    context,
  }) => {
    // First load registers the Service Worker; it only controls *later*
    // navigations, so an explicit wait + second navigation is needed
    // before offline behavior is genuinely exercised.
    await page.goto("/");
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    await page.goto("/discover").catch(() => {});
    // A real curly apostrophe (the offline page's actual rendered
    // text) — a straight `'` never matches.
    await expect(page.getByText("You’re offline")).toBeVisible();
    await expect(page.getByText("Reconnect to continue using MEDIO.")).toBeVisible();

    await context.setOffline(false);
    await page.goto("/discover");
    await expect(page.getByRole("heading", { level: 1, name: "Discover" })).toBeVisible();
  });

  test("a private mutation attempted while offline never falsely succeeds", async ({
    page,
    context,
  }) => {
    await page.goto("/movies/555");
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    await context.setOffline(true);
    await page.getByRole("button", { name: "Mark watched", exact: true }).click();
    // The Server Action's request simply fails offline (this Service
    // Worker never intercepts non-navigation requests, mutations
    // included — see public/sw.js). Next.js's own post-action refresh
    // then also fails offline, surfacing the route's real error
    // boundary ("Couldn't load this movie right now.") — an honest
    // failure state, not a silently broken page. Either way, the one
    // thing that must never appear is the *success* state: a mutation
    // that never reached the server must never read as "Watched."
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: "Watched", exact: true })).toHaveCount(0);

    await context.setOffline(false);
  });
});

test.describe("account-switch privacy with the Service Worker active", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.describe.configure({ retries: 2 });

  test("logging out and signing in as a different user never shows the previous account's content", async ({
    page,
  }) => {
    const stamp = Date.now();
    const emailA = `pwa-privacy-a-${stamp}@example.com`;
    const emailB = `pwa-privacy-b-${stamp}@example.com`;

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("PWA Privacy A");
    await page.getByLabel("Email").fill(emailA);
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

    // `UserIdentityLink` shows the signed-in user's own name — real,
    // visible identity content a stale cached response would leak
    // first. Scoped to the one real "Primary" navigation landmark
    // (DesktopNav, the visible one at this default desktop viewport)
    // rather than an ambiguous page-wide text match.
    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(primaryNav.getByText("PWA Privacy A")).toBeVisible();
    await page.getByRole("link", { name: /Open account settings for/ }).click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL("/");
    // The public Landing page has more than one "Get started" link
    // (header + hero) — the header one alone is enough to confirm we
    // really landed on the logged-out page.
    await expect(page.getByRole("banner").getByRole("link", { name: "Get started" })).toBeVisible();

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("PWA Privacy B");
    await page.getByLabel("Email").fill(emailB);
    await page.getByLabel("Password", { exact: true }).fill("correct horse battery staple 1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

    await expect(primaryNav.getByText("PWA Privacy B")).toBeVisible();
    await expect(primaryNav.getByText("PWA Privacy A")).toHaveCount(0);
  });
});

test.describe("install promotion policy — Landing", () => {
  // Landing is only ever the public, logged-out `/` experience — the
  // shared "authenticated" project session would otherwise land on
  // authenticated Home instead (see docs/authentication.md, "`/`
  // behavior by auth state").
  test.use({ storageState: { cookies: [], origins: [] } });

  test("desktop Landing tells the mobile Home Screen story without any MEDIO-owned install button", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "MEDIO, one tap away." })).toBeVisible();
    // No `beforeinstallprompt` was ever fired in this desktop context,
    // and `isMobileUserAgent` is false regardless — the install domain
    // resolves to "not-promoted" (see install-policy.ts), so neither
    // action ever mounts.
    await expect(page.getByRole("button", { name: "Install MEDIO" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add to Home Screen" })).toHaveCount(0);
    await expect(page.getByText(/download/i)).toHaveCount(0);
  });

  test.describe("mobile viewport", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("Landing still tells the mobile story, with no broken install UI in this test environment", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "MEDIO, one tap away." })).toBeVisible();
      // Real automated Chromium never fires `beforeinstallprompt` and
      // isn't recognized as iOS Safari — "unsupported" is the correct,
      // honest state here, same as a genuinely unsupported real mobile
      // browser: no dead/disabled action, just the informational story.
      await expect(page.getByRole("button", { name: "Install MEDIO" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Add to Home Screen" })).toHaveCount(0);
    });
  });
});

test.describe("install promotion policy — Settings", () => {
  test("desktop Settings never renders an install row", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Install MEDIO")).toHaveCount(0);
  });

  test.describe("mobile viewport", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("Settings shows no broken install row either", async ({ page }) => {
      await page.goto("/settings");
      await expect(page.getByText("Install MEDIO")).toHaveCount(0);
    });
  });
});
