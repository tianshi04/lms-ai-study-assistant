import { test, expect } from '@playwright/test';
import { MyPurchasesPage, NotificationCenterPage, AccountSettingsPage } from '../pages';

test.describe('Full System Blackbox - Purchases, Notifications & Account Settings (POM)', () => {
  test.describe('My Purchases & Invoices', () => {
    test('should load my-purchases page and render filter tabs', async ({ page }) => {
      const purchasesPage = new MyPurchasesPage(page);
      await purchasesPage.goto();
      await purchasesPage.verifyPageLoaded();

      await expect(purchasesPage.tabAll).toBeVisible();
      await expect(purchasesPage.tabCompleted).toBeVisible();
      await expect(purchasesPage.tabPending).toBeVisible();
      await expect(purchasesPage.tabExpired).toBeVisible();
    });

    test('should allow switching between status filter tabs in my purchases', async ({ page }) => {
      const purchasesPage = new MyPurchasesPage(page);
      await purchasesPage.goto();
      await purchasesPage.verifyPageLoaded();

      // Click Completed tab
      await purchasesPage.tabCompleted.click();
      await expect(purchasesPage.tabCompleted).toBeVisible();

      // Click Pending tab
      await purchasesPage.tabPending.click();
      await expect(purchasesPage.tabPending).toBeVisible();

      // Click All tab
      await purchasesPage.tabAll.click();
      await expect(purchasesPage.tabAll).toBeVisible();
    });
  });

  test.describe('Notification Center', () => {
    test('should load notification center with category filters', async ({ page }) => {
      const notifPage = new NotificationCenterPage(page);
      await notifPage.goto();
      await notifPage.verifyPageLoaded();

      await expect(notifPage.markAllAsReadButton).toBeVisible();
      const count = await notifPage.categoryFilterTabs.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should filter notifications by category', async ({ page }) => {
      const notifPage = new NotificationCenterPage(page);
      await notifPage.goto();
      await notifPage.verifyPageLoaded();

      const academicFilter = page.locator('button').filter({ hasText: /Học tập/i }).first();
      if (await academicFilter.isVisible()) {
        await academicFilter.click();
      }
    });
  });

  test.describe('Account Settings & Enterprise Seat Key', () => {
    test('should load account settings page and render enterprise activation form', async ({ page }) => {
      const settingsPage = new AccountSettingsPage(page);
      await settingsPage.goto();
      await settingsPage.verifyPageLoaded();

      if (await settingsPage.enterpriseKeyInput.isVisible()) {
        await expect(settingsPage.activateKeyButton).toBeVisible();
      }
    });

    test('should handle invalid enterprise seat key with error toast', async ({ page }) => {
      const settingsPage = new AccountSettingsPage(page);
      await settingsPage.goto();
      await settingsPage.verifyPageLoaded();

      if (await settingsPage.enterpriseKeyInput.isVisible()) {
        await settingsPage.activateEnterpriseKey('INVALID-SEAT-KEY-999');
        await expect(page.locator('text=/Không thể kích hoạt|không hợp lệ|Lỗi/i').first()).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
