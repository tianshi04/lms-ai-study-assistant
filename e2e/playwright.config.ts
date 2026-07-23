import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Read from .env file if available
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const AUTH_DIR = path.resolve(__dirname, '.auth');
const LEARNER_AUTH = path.join(AUTH_DIR, 'learner.json');
const INSTRUCTOR_AUTH = path.join(AUTH_DIR, 'instructor.json');
const ADMIN_AUTH = path.join(AUTH_DIR, 'admin.json');

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
    // ─── Auth Setup (must run first) ─────────────────────────────────────────
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // ─── Public / Unauthenticated (no storage state) ─────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // ─── Learner role ─────────────────────────────────────────────────────────
    {
      name: 'chromium-learner',
      use: {
        ...devices['Desktop Chrome'],
        storageState: LEARNER_AUTH,
      },
      dependencies: ['setup'],
    },

    // ─── Instructor role ──────────────────────────────────────────────────────
    {
      name: 'chromium-instructor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: INSTRUCTOR_AUTH,
      },
      dependencies: ['setup'],
    },

    // ─── Admin role ───────────────────────────────────────────────────────────
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_AUTH,
      },
      dependencies: ['setup'],
    },

    // ─── Cross-browser (full suite, learner auth) ─────────────────────────────
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: LEARNER_AUTH,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: LEARNER_AUTH,
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: LEARNER_AUTH,
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
