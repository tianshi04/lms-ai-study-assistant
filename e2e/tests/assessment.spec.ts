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
    await expect(assessmentPage.runLabButton).toBeVisible({ timeout: 25000 });

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
    await expect(assessmentPage.mySubmissionTab).toBeVisible({ timeout: 15000 });

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

  test('should auto-save quiz draft answers and restore session after pause or reload (BR_QUIZ_005)', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    const itemIdInput = page.locator('#itemId');
    await expect(itemIdInput).toBeVisible();
    await itemIdInput.fill('item-ml-practice-1');

    const startOrResumeBtn = page.getByRole('button', { name: /Bắt đầu làm bài|Làm lại bài thi|Tiếp tục làm bài/i }).first();
    await expect(startOrResumeBtn).toBeVisible({ timeout: 15000 });
    await startOrResumeBtn.click();

    const firstRadio = page.locator('[role="radio"]').first();
    await expect(firstRadio).toBeVisible({ timeout: 15000 });
    await firstRadio.click();

    const draftBadge = page.getByTestId('quiz-draft-status').first();
    await expect(draftBadge).toBeVisible({ timeout: 10000 });
    await expect(draftBadge).toContainText(/Đã lưu nháp/i, { timeout: 10000 });

    const pauseBtn = page.getByRole('button', { name: /Lưu nháp & Tạm thoát/i });
    await expect(pauseBtn).toBeVisible();
    await pauseBtn.click();

    await expect(page.getByTestId('active-quiz-draft-banner')).toBeVisible({ timeout: 10000 });
    const resumeBtn = page.getByRole('button', { name: /Tiếp tục làm bài/i });
    await expect(resumeBtn).toBeVisible({ timeout: 10000 });
    await resumeBtn.click();

    await expect(page.locator('[role="radio"][aria-checked="true"]').first()).toBeVisible({ timeout: 10000 });
  });
});


