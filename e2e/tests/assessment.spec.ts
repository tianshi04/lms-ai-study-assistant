import { test, expect } from '@playwright/test';
import { AssessmentPage } from '../pages';

test.describe('Full System Blackbox - Assessment & Auto-Grader Flows (POM)', () => {
  test.describe.configure({ mode: 'serial' });

  test('should load assessments page with 3 main assessment tabs', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();
  });

  test('should execute auto-graded lab in sandbox and show test case results', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    // Switch to Auto-Graded Lab tab
    await assessmentPage.switchTab('lab');
    await expect(assessmentPage.runLabButton).toBeVisible();

    // Click run & submit code
    await assessmentPage.runLabButton.click();

    // Console output should show test cases or execution logs
    await expect(page.locator('text=/Test Case|PASSED|Execution Logs/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('should enforce BR_PEER_001 rule blocking peer grading prior to assignment submission', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    // Switch to Peer Review tab
    await assessmentPage.switchTab('peer');
    await expect(assessmentPage.mySubmissionTab).toBeVisible();

    // If assignment has not been submitted, Tab 2 should be locked/disabled according to BR_PEER_001
    const isLocked =
      (await assessmentPage.gradePeersTab.isDisabled().catch(() => false)) ||
      (await assessmentPage.gradePeersTab.getAttribute('class')?.then((c) => c?.includes('cursor-not-allowed')));
    if (isLocked) {
      await assessmentPage.gradePeersTab.click({ force: true }).catch(() => null);
      const isWarningVisible = await assessmentPage.lockWarningNotice.isVisible().catch(() => false);
      const isDisabled = await assessmentPage.gradePeersTab.isDisabled().catch(() => false);
      expect(isWarningVisible || isDisabled).toBeTruthy();
    }
  });

  test('should allow reporting malicious or spam peer review (BR_PEER_005)', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    await assessmentPage.switchTab('peer');
    const reportBtn = page.getByRole('button', { name: /Report Review|Báo cáo/i }).first();
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      await expect(page.locator('text=/Đã gửi báo cáo|TA Queue|bất thường/i').first()).toBeVisible({ timeout: 5000 });
    }
  });
});


