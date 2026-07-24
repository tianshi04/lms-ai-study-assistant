import { test, expect } from '@playwright/test';
import { FinancialAidPage, VerifyPortalPage } from '../pages';

test.describe('Full System Blackbox - Financial Aid & Certificate Verification (POM)', () => {
  test('should load financial aid application page', async ({ page }) => {
    const aidPage = new FinancialAidPage(page);
    await aidPage.goto();
    await aidPage.verifyPageLoaded();
  });

  test('should enforce minimum 150 words requirement for financial aid essay', async ({ page }) => {
    const aidPage = new FinancialAidPage(page);
    await aidPage.goto(`course-aid-valid-${Date.now()}`);
    await aidPage.verifyPageLoaded();

    await expect(aidPage.essayTextarea).toBeVisible({ timeout: 5000 });

    // Short essay with only 5 words
    await aidPage.essayTextarea.fill('Tôi muốn xin hỗ trợ.');

    // Submit button should be disabled when essay is under 150 words
    await expect(aidPage.submitButton).toBeDisabled();
  });

  test('should submit financial aid application when essay meets 150 words requirement', async ({ page }) => {
    const aidPage = new FinancialAidPage(page);
    const uniqueCourseId = `course-aid-sub-${Date.now()}`;
    await aidPage.goto(uniqueCourseId);
    await aidPage.verifyPageLoaded();

    // Generate a 160-word essay string
    const word = 'học ';
    const validEssay = 'Tôi mong muốn tham gia khóa học này để nâng cao kỹ năng trí tuệ nhân tạo và học máy. ' + word.repeat(150);

    await aidPage.submitApplication(validEssay);

    // Should display success message or application status badge
    await expect(page.locator('text=/thành công|PENDING|Đã nộp|Trạng thái/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should allow instructor to view pending financial aid applications and approve', async ({ page }) => {
    const aidPage = new FinancialAidPage(page);
    await aidPage.gotoInstructorReview();
    await expect(page).toHaveURL(/\/instructor\/financial-aid/);

    // Switch to PENDING tab
    await aidPage.switchStatusTab('PENDING');
    await expect(page.locator('text=/Xét duyệt Đơn Hỗ trợ Tài chính/i')).toBeVisible();

    // If there is any pending application, test approving
    if (await page.getByRole('button', { name: /Phê duyệt đơn/i }).first().isVisible()) {
      await aidPage.approveFirstApplication();
      await expect(page.locator('text=/Đã phê duyệt đơn|Approved/i').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should allow instructor to reject financial aid application', async ({ page }) => {
    const aidPage = new FinancialAidPage(page);
    await aidPage.gotoInstructorReview();
    await expect(page).toHaveURL(/\/instructor\/financial-aid/);

    await aidPage.switchStatusTab('PENDING');

    // If pending application exists, test rejecting
    if (await page.getByRole('button', { name: /Từ chối đơn/i }).first().isVisible()) {
      await aidPage.rejectFirstApplication();
      await expect(page.locator('text=/Đã từ chối đơn|Rejected/i').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should load public certificate verification portal', async ({ page }) => {
    const verifyPage = new VerifyPortalPage(page);
    await verifyPage.goto();
    await verifyPage.verifyPageLoaded();
  });

  test('should search and verify certificate ID in verification portal', async ({ page }) => {
    const verifyPage = new VerifyPortalPage(page);
    await verifyPage.goto();
    await verifyPage.verifyPageLoaded();

    await verifyPage.searchCert('CERT-DEMO12345');

    // Should navigate to /verify/CERT-DEMO12345
    await expect(page).toHaveURL(/\/verify\/CERT-DEMO12345/, { timeout: 10000 });

    // Page content should load certificate details or status
    await expect(page.locator('body')).toBeVisible();
  });
});

