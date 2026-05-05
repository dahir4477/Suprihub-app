import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:8080",
    trace: "on-first-retry"
  },
  webServer: process.env.E2E_SKIP_DOCKER === "true"
    ? undefined
    : {
        command: "docker compose up --build",
        cwd: "..",
        url: process.env.E2E_BASE_URL || "http://localhost:8080",
        timeout: 120_000,
        reuseExistingServer: true
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
