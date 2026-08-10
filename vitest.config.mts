import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Playwright owns everything under e2e/ — keep Vitest scoped to
// colocated unit/component tests so the two suites never overlap.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
  },
});
