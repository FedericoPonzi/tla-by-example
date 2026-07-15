import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the in-browser TLC checker.
 *
 * These tests run TLC inside a real browser via CheerpJ, so they need a browser
 * and network access (CheerpJ downloads its runtime from a CDN at load time).
 * They are intentionally kept separate from the jsdom `npm test` unit suite.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 5 * 60 * 1000,
  expect: { timeout: 4 * 60 * 1000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
