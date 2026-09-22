import { defineConfig } from '@playwright/test';

const basePath = process.env.BASE_PATH || '/';
const baseURL = 'http://localhost:4322' + basePath.replace(/\/$/, '') + '/';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  use: {
    baseURL, browserName: 'chromium', channel: 'chrome',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4322 --ignore-lock',
    url: baseURL, reuseExistingServer: false, timeout: 30_000,
  },
});
