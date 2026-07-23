import { test } from '@playwright/test';
import { LoginPage } from '../pages';

test.describe('Full System Blackbox - Authentication Flow (POM)', () => {
  test('should display login page form elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();
  });
});
