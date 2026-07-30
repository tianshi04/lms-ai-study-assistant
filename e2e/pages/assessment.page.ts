import { Page, Locator, expect } from '@playwright/test';

export class AssessmentPage {
  readonly page: Page;

  // Main Tabs
  readonly quizTab: Locator;
  readonly labTab: Locator;
  readonly peerTab: Locator;

  // Quiz elements
  readonly confirmHonorButton: Locator;
  readonly honorAgreedBadge: Locator;
  readonly submitQuizButton: Locator;
  readonly honorCheckbox: Locator;
  readonly agreeAndContinueButton: Locator;

  // Lab elements
  readonly runLabButton: Locator;

  // Peer elements
  readonly mySubmissionTab: Locator;
  readonly gradePeersTab: Locator;
  readonly gradeAppealTab: Locator;
  readonly submitPeerAssignmentButton: Locator;
  readonly lockWarningNotice: Locator;

  constructor(page: Page) {
    this.page = page;

    this.quizTab = page.getByRole('button', { name: /Graded Quiz/i });
    this.labTab = page.getByRole('button', { name: /Auto-Graded Lab/i });
    this.peerTab = page.getByRole('button', { name: /Peer Review & Appeal/i });

    this.confirmHonorButton = page.getByRole('button', { name: /Confirm Honor Code|Xác nhận Cam kết Trung thực/i });
    this.honorAgreedBadge = page.locator('text=/Honor Code Agreed|Đã xác nhận Cam kết Trung thực/i');
    this.submitQuizButton = page.getByRole('button', { name: /Submit Graded Quiz|Nộp bài thi/i });
    this.honorCheckbox = page.locator('input[type="checkbox"]');
    this.agreeAndContinueButton = page.getByRole('button', { name: /I Agree & Continue/i });

    this.runLabButton = page.getByRole('button', { name: /Run & Submit Code/i });

    this.mySubmissionTab = page.getByRole('button', { name: /1. My Submission/i });
    this.gradePeersTab = page.getByRole('button', { name: /2. Grade Peers/i });
    this.gradeAppealTab = page.getByRole('button', { name: /3. Grade Appeal/i });
    this.submitPeerAssignmentButton = page.getByRole('button', { name: /Submit Peer Assignment/i });
    this.lockWarningNotice = page.locator('text=/BR_PEER_001/i');
  }

  async goto() {
    await this.page.goto('/assessments');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/assessments/);
    await expect(this.quizTab).toBeVisible();
    await expect(this.labTab).toBeVisible();
    await expect(this.peerTab).toBeVisible();
  }

  async switchTab(tab: 'quiz' | 'lab' | 'peer') {
    if (tab === 'quiz') await this.quizTab.click();
    if (tab === 'lab') await this.labTab.click();
    if (tab === 'peer') await this.peerTab.click();
  }

  async agreeHonorCode() {
    await expect(this.confirmHonorButton.or(this.honorAgreedBadge)).toBeVisible({ timeout: 10000 });
    if (await this.confirmHonorButton.isVisible()) {
      await this.confirmHonorButton.click();
      await expect(this.honorCheckbox).toBeVisible({ timeout: 5000 });
      await this.honorCheckbox.check({ force: true });
      await this.agreeAndContinueButton.click();
    }
  }

  async submitQuiz() {
    await this.submitQuizButton.scrollIntoViewIfNeeded();
    await this.submitQuizButton.click();
  }

  async submitPeerAssignment() {
    await this.submitPeerAssignmentButton.scrollIntoViewIfNeeded();
    await this.submitPeerAssignmentButton.click();
    // Wait for async RPC call + setHasSubmitted(true) state update to settle
    await this.page.waitForTimeout(1500);
  }

  async gradeFirstPeer() {
    if (await this.submitPeerAssignmentButton.isVisible()) {
      await this.submitPeerAssignment();
    }
    await this.gradePeersTab.scrollIntoViewIfNeeded();
    await this.gradePeersTab.click({ force: true });
    const submitPeerGradeBtn = this.page.getByRole('button', { name: /Submit Grade for Peer #1/i });
    await expect(submitPeerGradeBtn).toBeVisible({ timeout: 5000 });
    await submitPeerGradeBtn.scrollIntoViewIfNeeded();
    await submitPeerGradeBtn.click({ force: true });
  }

  async submitAppeal(reason: string) {
    if (await this.submitPeerAssignmentButton.isVisible()) {
      await this.submitPeerAssignment();
    }
    await this.gradeAppealTab.scrollIntoViewIfNeeded();
    await this.gradeAppealTab.click({ force: true });

    // If still locked (BR_PEER_001), assignment state hasn't settled yet — retry once
    if (await this.page.locator('text=/BR_PEER_001/i').first().isVisible()) {
      await this.page.waitForTimeout(1000);
      await this.gradeAppealTab.click({ force: true });
    }

    const textarea = this.page.locator('textarea[placeholder*="Explain why"], textarea[placeholder*="reviewed by a TA"]').first();
    await expect(textarea).toBeVisible({ timeout: 10000 });
    await textarea.fill(reason);
    const submitBtn = this.page.getByRole('button', { name: /Submit Appeal to TA/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });
    // Wait for appeal status state to update and render
    await this.page.waitForTimeout(1000);
  }
}




