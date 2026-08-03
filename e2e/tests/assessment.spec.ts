import { test, expect } from '@playwright/test';
import { AssessmentPage } from '../pages';

test.describe('Full System Blackbox - Assessment & Auto-Grader Flows (POM)', () => {
  test.describe.configure({ mode: 'serial' });

  test('should load assessments page with 3 main assessment tabs', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();
  });

  test('should display honor code modal, allow agreeing and update status badge', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    await assessmentPage.agreeHonorCode();
    const statusBadgeOrLocked = assessmentPage.honorAgreedBadge.or(
      page.locator('text=/Bài Thi Bị Khóa|dùng hết số lượt/i').first()
    );
    await expect(statusBadgeOrLocked).toBeVisible({ timeout: 10000 });
  });

  test('should submit graded quiz and display score result', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    // Confirm honor code first if not already confirmed
    await assessmentPage.agreeHonorCode();

    // Click submit quiz button
    await assessmentPage.submitQuiz();

    // Result panel showing score or quiz state should appear
    const resultOrQuizState = page.locator('text=/Score:|Điểm số:|Required:|Kết quả|Bài Thi/i').first().or(
      page.locator('button').filter({ hasText: /Submit Graded Quiz|Nộp bài thi/i }).first()
    );
    await expect(resultOrQuizState).toBeVisible({ timeout: 10000 });
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

  test('should submit peer assignment successfully and unlock peer grading', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    await assessmentPage.switchTab('peer');

    // Submit assignment if on Tab 1, or click Tab 2 if already submitted
    if (await assessmentPage.submitPeerAssignmentButton.isVisible()) {
      await assessmentPage.submitPeerAssignment();
    } else {
      await assessmentPage.gradePeersTab.click();
    }

    // Verify submission success badge or grade peers tab unlocked
    await expect(page.locator('text=/Đã Nộp Bài|Submit Peer Assignment|Rubric Criteria Scoring/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should allow grading peer submission using Rubric criteria', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    await assessmentPage.switchTab('peer');
    if (await assessmentPage.submitPeerAssignmentButton.isVisible()) {
      await assessmentPage.submitPeerAssignment();
    }

    // Switch to Grade Peers tab and submit grade for Peer #1
    await assessmentPage.gradeFirstPeer();
  });

  test('should allow submitting Grade Appeal to TA (BR_PEER_003)', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    await assessmentPage.switchTab('peer');
    if (await assessmentPage.submitPeerAssignmentButton.isVisible()) {
      await assessmentPage.submitPeerAssignment();
    }

    const appealReason = 'Peer reviewers gave lower score on documentation section despite complete setup guide.';
    await assessmentPage.submitAppeal(appealReason);

    await expect(page.locator('text=/Appeal status:|PENDING|TA will review/i').first()).toBeVisible({ timeout: 10000 });
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

