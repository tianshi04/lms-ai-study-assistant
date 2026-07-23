import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Read from .env file if available
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AUTH_FILE = path.resolve(__dirname, '.auth/user.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : '50%',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: BASE_URL,
    actionTimeout: 10000,
    navigationTimeout: 15000,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
  ],

  /* Disabled auto webServer since FE and BE are started manually */
  // webServer: {
  //   command: 'npm --prefix ../frontend run dev',
  //   url: BASE_URL,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
