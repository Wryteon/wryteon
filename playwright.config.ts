import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4321);

const requiredE2eEnv = [
  "WRYTEON_ADMIN_USERNAME",
  "WRYTEON_ADMIN_EMAIL",
  "WRYTEON_ADMIN_PASSWORD",
] as const;

const missingE2eEnv = requiredE2eEnv.filter(
  (name) => !(process.env[name] && String(process.env[name]).trim().length > 0),
);

if (missingE2eEnv.length > 0) {
  throw new Error(
    "Missing required environment variables for E2E: " +
      missingE2eEnv.join(", ") +
      "\n\nSet them before running `npm run test:e2e` so the seed can create an admin user and the tests can log in." +
      "\nExample:" +
      "\n  export WRYTEON_ADMIN_USERNAME=admin" +
      "\n  export WRYTEON_ADMIN_EMAIL=admin@example.com" +
      "\n  export WRYTEON_ADMIN_PASSWORD=change-me",
  );
}

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
