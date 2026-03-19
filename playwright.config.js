// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/** When set, always spawn a new python server (fails if 8080 is busy). */
const forceFreshServer =
  process.env.PLAYWRIGHT_FRESH_SERVER === "1" ||
  process.env.PLAYWRIGHT_FRESH_SERVER === "true";

module.exports = defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "python3 -m http.server 8080",
    url: "http://127.0.0.1:8080/",
    // Reuse an already-running Python server on 8080 (avoids bind errors when CI sets CI=1).
    reuseExistingServer: !forceFreshServer,
    timeout: 60_000,
  },
});
