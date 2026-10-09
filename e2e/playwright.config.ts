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
  workers: process.env.CI ? 1 : 2,
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
    navigationTimeout: 30000,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    extraHTTPHeaders: {
      'Accept-Language': 'vi',
    },
  },

  projects: [
    // ─── Auth Setup (must run first) ─────────────────────────────────────────
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // ─── Learner role ─────────────────────────────────────────────────────────
    {
      name: 'chromium-learner',
      testMatch: [
        '**/health.spec.ts',
        '**/auth.spec.ts',
        '**/forgot-password.spec.ts',
        '**/catalog.spec.ts',
        '**/learning.spec.ts',
        '**/course-completion.spec.ts',
        '**/assessment.spec.ts',
        '**/forum.spec.ts',
        '**/financial-aid.spec.ts',
        '**/payment.spec.ts',
        '**/purchases-notifications.spec.ts',
        '**/certificate.spec.ts',
        '**/organization.spec.ts',
        '**/instructor-application.spec.ts',
        '**/role-dashboards.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: LEARNER_AUTH,
      },
      dependencies: ['setup'],
    },

    // ─── Instructor role ──────────────────────────────────────────────────────
    {
      name: 'chromium-instructor',
      testMatch: [
        '**/instructor.spec.ts',
        '**/question-bank.spec.ts',
        '**/financial-aid.spec.ts',
        '**/organization.spec.ts',
        '**/role-dashboards.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: INSTRUCTOR_AUTH,
      },
      dependencies: ['setup'],
    },

    // ─── Admin role ───────────────────────────────────────────────────────────
    {
      name: 'chromium-admin',
      testMatch: [
        '**/admin.spec.ts',
        '**/admin-moderation.spec.ts',
        '**/admin-applications.spec.ts',
        '**/partner.spec.ts',
        '**/organization.spec.ts',
        '**/role-dashboards.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_AUTH,
      },
      dependencies: ['setup'],
    },

    // ─── Cross-browser (learner & public flows) ────────────────────────────────
    {
      name: 'firefox',
      testMatch: [
        '**/health.spec.ts',
        '**/auth.spec.ts',
        '**/forgot-password.spec.ts',
        '**/catalog.spec.ts',
        '**/learning.spec.ts',
        '**/course-completion.spec.ts',
        '**/assessment.spec.ts',
        '**/forum.spec.ts',
        '**/financial-aid.spec.ts',
        '**/payment.spec.ts',
        '**/purchases-notifications.spec.ts',
        '**/certificate.spec.ts',
        '**/organization.spec.ts',
        '**/instructor-application.spec.ts',
      ],
      use: {
        ...devices['Desktop Firefox'],
        storageState: LEARNER_AUTH,
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testMatch: [
        '**/health.spec.ts',
        '**/auth.spec.ts',
        '**/forgot-password.spec.ts',
        '**/catalog.spec.ts',
        '**/learning.spec.ts',
        '**/course-completion.spec.ts',
        '**/assessment.spec.ts',
        '**/forum.spec.ts',
        '**/financial-aid.spec.ts',
        '**/payment.spec.ts',
        '**/purchases-notifications.spec.ts',
        '**/certificate.spec.ts',
        '**/organization.spec.ts',
        '**/instructor-application.spec.ts',
      ],
      use: {
        ...devices['Desktop Safari'],
        storageState: LEARNER_AUTH,
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Chrome',
      testMatch: [
        '**/health.spec.ts',
        '**/auth.spec.ts',
        '**/forgot-password.spec.ts',
        '**/catalog.spec.ts',
        '**/learning.spec.ts',
        '**/course-completion.spec.ts',
        '**/assessment.spec.ts',
        '**/forum.spec.ts',
        '**/financial-aid.spec.ts',
        '**/payment.spec.ts',
        '**/purchases-notifications.spec.ts',
        '**/certificate.spec.ts',
        '**/organization.spec.ts',
        '**/instructor-application.spec.ts',
      ],
      use: {
        ...devices['Pixel 5'],
        storageState: LEARNER_AUTH,
      },
      dependencies: ['setup'],
    },
  ],
});


