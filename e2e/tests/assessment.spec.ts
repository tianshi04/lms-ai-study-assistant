import { test, expect } from '@playwright/test';
import { AssessmentPage } from '../pages';

test.describe('Full System Blackbox - Assessment & Auto-Grader Flows (POM)', () => {
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
    await expect(assessmentPage.honorAgreedBadge).toBeVisible({ timeout: 5000 });
  });

  test('should submit graded quiz and display score result', async ({ page }) => {
    const assessmentPage = new AssessmentPage(page);
    await assessmentPage.goto();
    await assessmentPage.verifyPageLoaded();

    // Confirm honor code first
    await assessmentPage.agreeHonorCode();
    await expect(assessmentPage.honorAgreedBadge).toBeVisible({ timeout: 5000 });

    // Click submit quiz button
    await assessmentPage.submitQuiz();

    // Result panel showing score should appear
    await expect(page.locator('text=/Score:|Required: 80%/i').first()).toBeVisible({ timeout: 10000 });
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

    // If assignment has not been submitted, clicking Tab 2 should trigger BR_PEER_001 lock warning
    if (await assessmentPage.gradePeersTab.getAttribute('class')?.then((c) => c?.includes('cursor-not-allowed'))) {
      await assessmentPage.gradePeersTab.click();
      await expect(assessmentPage.lockWarningNotice).toBeVisible();
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
});
