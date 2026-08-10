import { test, expect } from '@playwright/test';
import { LoginPage, RegisterPage } from '../pages';
import { E2E_CONFIG } from '../config/credentials';

test.describe('Full System Blackbox - Authentication Flow (POM)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('should display login page form elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();
  });

  test('should login successfully with valid learner credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    const { email, password } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, password);

    // Should redirect to homepage or dashboard after login
    await expect(page).toHaveURL(/\/(courses|learn|account-settings)?$/, { timeout: 10000 });
  });

  test('should show error message when login fails with wrong password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    const { email } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, 'wrong_password_999999');

    // Error alert banner should appear
    await expect(loginPage.errorBanner).toBeVisible({ timeout: 5000 });
  });

  test('should navigate from login to register page via link', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    await loginPage.registerLink.click();
    await expect(page).toHaveURL(/\/auth\/register/, { timeout: 5000 });
  });

  test('should register a new learner user successfully', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.verifyPageLoaded();

    const uniqueEmail = `testuser${Date.now()}@coursera.ai`;
    await registerPage.register('Test User E2E', uniqueEmail, 'Password123', '1');

    // New 2-step flow auto-logs in after registration and redirects to homepage
    await expect(page).toHaveURL(/\/(courses|learn)?$/, { timeout: 15000 });
  });

  test('should redirect to requested URL parameter after successful login', async ({ page, context }) => {
    // Clear storage state to guarantee unauthenticated initial state for redirect test
    await context.clearCookies();
    await page.addInitScript(() => localStorage.clear());

    const loginPage = new LoginPage(page);
    await loginPage.goto('/account-settings');

    const { email, password } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, password);

    // Should redirect specifically to /account-settings
    await expect(page).toHaveURL(/\/account-settings/, { timeout: 20000 });
  });
});
