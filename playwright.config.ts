import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:47831",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:47831/api/health",
    reuseExistingServer: false,
    timeout: 45000,
    env: {
      GITLEARN_DATA_DIR: `.local/e2e-data-${Date.now()}`,
      OPENAI_API_KEY: "",
      OPEN_AI_API: "",
    },
  },
});
