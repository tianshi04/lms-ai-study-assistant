import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { E2E_CONFIG } from '../config/credentials';

const AUTH_DIR = path.join(__dirname, '../.auth');

/**
 * Perform a real login for a given role and save the browser storage state.
 * Auth tokens are stored in localStorage by the Next.js app after successful login.
 */
async function loginAndSave(
  page: Parameters<Parameters<typeof setup>[1]>[0]['page'],
  email: string,
  password: string,
  stateFile: string,
): Promise<void> {
  await page.goto('/auth/login');

  // Fill credentials and submit
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /đăng nhập ngay/i }).click();

  // Wait until the app redirects away from the login page (successful auth)
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15000 });

  // Confirm a token was stored in localStorage
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  expect(token, `access_token should be set after login for ${email}`).toBeTruthy();

  await page.context().storageState({ path: stateFile });
}

// Ensure .auth directory exists before any setup step runs
setup.beforeAll(() => {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
});

setup('authenticate as learner', async ({ page }) => {
  const { email, password } = E2E_CONFIG.credentials.learner;
  await loginAndSave(page, email, password, path.join(AUTH_DIR, 'learner.json'));
});

setup('authenticate as instructor', async ({ page }) => {
  const { email, password } = E2E_CONFIG.credentials.instructor;
  await loginAndSave(page, email, password, path.join(AUTH_DIR, 'instructor.json'));
});

setup('authenticate as admin', async ({ page }) => {
  const { email, password } = E2E_CONFIG.credentials.admin;
  await loginAndSave(page, email, password, path.join(AUTH_DIR, 'admin.json'));
});
