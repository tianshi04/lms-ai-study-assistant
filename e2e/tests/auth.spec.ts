import { test, expect } from '@playwright/test';
import { LoginPage, RegisterPage } from '../pages';
import { E2E_CONFIG } from '../config/credentials';

test.describe('Full System Blackbox - Authentication Flow (POM)', () => {
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
    await expect(page).toHaveURL(/\/(courses|learn|auth\/profile)?$/, { timeout: 10000 });
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

    const uniqueEmail = `testuser_${Date.now()}@coursera.ai`;
    await registerPage.register('Test User E2E', uniqueEmail, '123456', '1');

    // Should show success banner
    await expect(registerPage.successBanner).toBeVisible({ timeout: 5000 });

    // Should redirect to login after delay
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  test('should redirect to requested URL parameter after successful login', async ({ page, context }) => {
    // Clear storage state to guarantee unauthenticated initial state for redirect test
    await context.clearCookies();
    await page.addInitScript(() => localStorage.clear());

    const loginPage = new LoginPage(page);
    await loginPage.goto('/auth/profile');

    const { email, password } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, password);

    // Should redirect specifically to /auth/profile
    await expect(page).toHaveURL(/\/auth\/profile/, { timeout: 10000 });
  });
});
