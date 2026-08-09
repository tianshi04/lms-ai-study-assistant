import { test, expect } from '@playwright/test';
import { AdminApplicationsPage } from '../pages';

test.describe('Full System Blackbox - Admin Instructor Applications Moderation (POM)', () => {
  test('should load admin instructor applications page with status tabs', async ({ page }) => {
    const adminAppsPage = new AdminApplicationsPage(page);
    await adminAppsPage.goto();
    await adminAppsPage.verifyPageLoaded();

    await expect(adminAppsPage.allTab).toBeVisible();
    await expect(adminAppsPage.pendingTab).toBeVisible();
    await expect(adminAppsPage.approvedTab).toBeVisible();
    await expect(adminAppsPage.rejectedTab).toBeVisible();
  });

  test('should filter applications by status tabs', async ({ page }) => {
    const adminAppsPage = new AdminApplicationsPage(page);
    await adminAppsPage.goto();
    await adminAppsPage.verifyPageLoaded();

    await adminAppsPage.filterByStatus('pending');
    await expect(adminAppsPage.pendingTab).toHaveAttribute('aria-pressed', 'true');

    await adminAppsPage.filterByStatus('approved');
    await expect(adminAppsPage.approvedTab).toHaveAttribute('aria-pressed', 'true');

    await adminAppsPage.filterByStatus('all');
    await expect(adminAppsPage.allTab).toHaveAttribute('aria-pressed', 'true');
  });
});
