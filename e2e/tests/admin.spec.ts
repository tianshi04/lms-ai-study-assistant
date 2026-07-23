import { test, expect } from '@playwright/test';
import { AdminDashboardPage } from '../pages';

test.describe('Full System Blackbox - Admin Management Dashboard (POM)', () => {
  test('should load admin enterprise dashboard page', async ({ page }) => {
    const adminPage = new AdminDashboardPage(page);
    await adminPage.goto();
    await adminPage.verifyPageLoaded();
  });

  test('should allow creating a new enterprise seat license key via modal', async ({ page }) => {
    const adminPage = new AdminDashboardPage(page);
    await adminPage.goto();
    await adminPage.verifyPageLoaded();

    const partnerName = `Đại Học CNTT ${Date.now()}`;
    const seatKey = `UIT-KEY-${Date.now()}`;

    await adminPage.createNewSeatKey(partnerName, seatKey);

    // Verify created enterprise seat license appears in list or toast (target .first() to avoid strict mode collision)
    await expect(page.locator(`text=${partnerName}`).first()).toBeVisible({ timeout: 5000 });
  });

  test('should allow opening assign enterprise seat modal', async ({ page }) => {
    const adminPage = new AdminDashboardPage(page);
    await adminPage.goto();
    await adminPage.verifyPageLoaded();

    await adminPage.assignSeatButton.click();

    // Verify assign modal opens
    await expect(page.locator('text=/Gán Suất Học Enterprise/i').first()).toBeVisible({ timeout: 5000 });
  });
});
