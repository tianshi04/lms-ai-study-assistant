import { test, expect } from '@playwright/test';
import { LoginPage, RegisterPage } from '../pages';
import { E2E_CONFIG } from '../config/credentials';

test.describe('Full System Blackbox - Authentication Flow (POM)', () => {
  test('should display login page form elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('should login successfully with valid learner credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const { email, password } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, password);

    // Should redirect away from login page
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10000 });

    // Should have set access_token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();
  });

  test('should show error message when login fails with wrong password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login('learner@coursera.ai', 'wrongpassword999');

    // Error banner should appear
    await expect(loginPage.errorBanner).toBeVisible({ timeout: 5000 });
  });

  test('should navigate from login to register page via link', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const registerPage = new RegisterPage(page);

    await loginPage.goto();
    await loginPage.registerLink.click();

    await registerPage.verifyPageLoaded();
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

  test('should redirect to requested URL parameter after successful login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto('/auth/profile');

    const { email, password } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, password);

    // Should redirect specifically to /auth/profile
    await expect(page).toHaveURL(/\/auth\/profile/, { timeout: 10000 });
  });
});
