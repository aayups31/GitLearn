import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/desktop",
  outputDir: ".local/test-results/desktop",
  workers: 1,
  timeout: 90000,
  retries: 0,
  use: { trace: "retain-on-failure" },
});
