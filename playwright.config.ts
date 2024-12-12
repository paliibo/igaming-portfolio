import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env', quiet: true });

const ports = {
  linepulse: Number(process.env['E2E_LINEPULSE_PORT'] ?? 3000),
  spinharbor: Number(process.env['E2E_SPINHARBOR_PORT'] ?? 3001),
  ledgerarc: Number(process.env['E2E_LEDGERARC_PORT'] ?? 3002),
};
const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/playwright-report' }]],
  outputDir: 'e2e/test-results',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  metadata: { apiUrl, ports },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: process.env['E2E_START_SERVERS']
    ? [
        {
          command: `pnpm --filter @igaming/linepulse exec next dev -p ${ports.linepulse}`,
          url: `http://localhost:${ports.linepulse}/login`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: `pnpm --filter @igaming/spinharbor exec next dev -p ${ports.spinharbor}`,
          url: `http://localhost:${ports.spinharbor}/login`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
        {
          command: `pnpm --filter @igaming/ledgerarc exec next dev -p ${ports.ledgerarc}`,
          url: `http://localhost:${ports.ledgerarc}/login`,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      ]
    : undefined,
});
