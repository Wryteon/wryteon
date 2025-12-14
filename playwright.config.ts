import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4321);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `mkdir -p .db && rm -f .db/e2e.sqlite && npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      ASTRO_DATABASE_FILE: "./.db/e2e.sqlite",
    },
  },
});
