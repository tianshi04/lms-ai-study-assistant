import { test, expect } from '@playwright/test';
import * as path from 'path';
import { AdminCourseReviewPage, AdminCategoriesPage } from '../pages';

const AUTH_DIR = path.join(__dirname, '../.auth');
const ADMIN_AUTH = path.join(AUTH_DIR, 'admin.json');

test.describe('Full System Blackbox - Admin Moderation & Taxonomy (POM)', () => {
  test.use({ storageState: ADMIN_AUTH });

  test.describe('Course Review & Publishing Workflow', () => {
    test('should load course reviewer portal page with status tabs', async ({ page }) => {
      const reviewPage = new AdminCourseReviewPage(page);
      await reviewPage.goto();
      await reviewPage.verifyPageLoaded();

      await expect(reviewPage.pendingTab).toBeVisible();
      await expect(reviewPage.publishedTab).toBeVisible();
      await expect(reviewPage.draftTab).toBeVisible();
      await expect(reviewPage.rejectedTab).toBeVisible();
    });

    test('should allow switching between status filter tabs in course reviewer portal', async ({ page }) => {
      const reviewPage = new AdminCourseReviewPage(page);
      await reviewPage.goto();
      await reviewPage.verifyPageLoaded();

      // Switch to Published tab
      await reviewPage.filterByTab('published');
      await expect(reviewPage.publishedTab).toBeVisible();

      // Switch to Draft tab
      await reviewPage.filterByTab('draft');
      await expect(reviewPage.draftTab).toBeVisible();

      // Switch back to Pending tab
      await reviewPage.filterByTab('pending');
      await expect(reviewPage.pendingTab).toBeVisible();
    });

    test('should open reject modal when clicking reject on a pending course', async ({ page }) => {
      const reviewPage = new AdminCourseReviewPage(page);
      await reviewPage.goto();
      await reviewPage.verifyPageLoaded();

      const rejectBtn = page.getByRole('button', { name: /Từ chối \(Reject\)/i }).first();
      if (await rejectBtn.isVisible()) {
        await rejectBtn.click();
        await expect(reviewPage.rejectModal).toBeVisible({ timeout: 5000 });
        await expect(reviewPage.rejectReasonInput).toBeVisible();
      }
    });
  });

  test.describe('Categories & Taxonomy Management', () => {
    test('should load admin categories page with subject and level lists', async ({ page }) => {
      const categoriesPage = new AdminCategoriesPage(page);
      await categoriesPage.goto();
      await categoriesPage.verifyPageLoaded();

      await expect(categoriesPage.nameInput).toBeVisible();
      await expect(categoriesPage.createButton).toBeVisible();
      await expect(categoriesPage.subjectsList).toBeVisible();
      await expect(categoriesPage.levelsList).toBeVisible();
    });

    test('should allow creating a new taxonomy category', async ({ page }) => {
      const categoriesPage = new AdminCategoriesPage(page);
      await categoriesPage.goto();
      await categoriesPage.verifyPageLoaded();

      const catName = `Chủ đề E2E ${Date.now()}`;
      await categoriesPage.createCategory(catName);

      // Verify category appears in subject list
      await expect(page.locator(`text=${catName}`).first()).toBeVisible({ timeout: 15000 });
    });
  });
});
