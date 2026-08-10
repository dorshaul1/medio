// A defense-in-depth production guard — see docs/settings.md, "Developer
// tools". `features/settings/settings-params.ts`'s
// `isDeveloperSettingsEnabled()` already keeps the "Developer" category
// and its route unreachable in production, but these mutations are real,
// destructive (`resetAllUserData`) or bulk-writing (`seedMockData`)
// database operations — this second, independent check inside the
// mutations themselves means a production build can never run them even
// if something upstream (a bug, a direct Server Action call) skipped the
// route-level gate.
export function assertDeveloperToolsEnabled(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Developer tools are not available in production");
  }
}
