import { test, expect } from '@playwright/test';
import { ForgotPasswordPage, LoginPage } from '../pages';

test.describe('Full System Blackbox - Forgot Password Flow (POM)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should load forgot-password page with Google authentication option', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    await forgotPage.goto();
    await forgotPage.verifyPageLoaded();

    await expect(forgotPage.googleAuthButton).toBeVisible();
    await expect(forgotPage.backToLoginLink).toBeVisible();
  });

  test('should navigate back to login page from forgot-password link', async ({ page }) => {
    const forgotPage = new ForgotPasswordPage(page);
    const loginPage = new LoginPage(page);

    await forgotPage.goto();
    await forgotPage.verifyPageLoaded();

    await forgotPage.backToLoginLink.click();
    await loginPage.verifyPageLoaded();
  });
});
