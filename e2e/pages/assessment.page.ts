import { Page, Locator, expect } from '@playwright/test';

export class AssessmentPage {
  readonly page: Page;

  // Main Tabs
  readonly quizTab: Locator;
  readonly labTab: Locator;
  readonly peerTab: Locator;

  // Quiz elements
  readonly openHonorButton: Locator; // Button to open honor code modal
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

    this.openHonorButton = page.getByRole('button', { name: /Xác nhận Cam kết Trung thực|Agree Honor Code|Confirm Honor Code|I Agree \& Continue/i }).first();
    this.honorAgreedBadge = page.getByTestId('honor-agreed-badge');
    this.submitQuizButton = page.getByRole('button', { name: /Submit Graded Quiz|Nộp bài thi/i });
    this.honorCheckbox = page.locator('.fixed.inset-0 input[type="checkbox"]').first();
    this.agreeAndContinueButton = page.locator('.fixed.inset-0 button').filter({ hasText: /Tôi đồng ý \& Tiếp tục|I Agree \& Continue|Submitting/i }).first();

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
    // Click the button to open the honor code modal
    await this.openHonorButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await this.openHonorButton.isVisible()) {
      await this.openHonorButton.click();
    }

    // Wait for modal to animate open and checkbox to appear
    await this.honorCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    await this.honorCheckbox.click({ force: true });

    // Wait for the submit button to be enabled then click
    await this.agreeAndContinueButton.waitFor({ state: 'visible', timeout: 5000 });
    await this.agreeAndContinueButton.click();
    await this.honorAgreedBadge.waitFor({ state: 'visible', timeout: 10000 });
  }

  async submitQuiz() {
    await this.submitQuizButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    // If button is disabled (result already showing from prior session), skip click
    if (!await this.submitQuizButton.isVisible() || await this.submitQuizButton.isDisabled()) return;
    await this.submitQuizButton.scrollIntoViewIfNeeded();
    await this.submitQuizButton.click();
  }

  async submitPeerAssignment() {
    await this.submitPeerAssignmentButton.scrollIntoViewIfNeeded();
    await this.submitPeerAssignmentButton.click();
    // Wait for submit button to hide or submission confirmation to appear
    await this.submitPeerAssignmentButton.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);
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

    // Wait for BR_PEER_001 lock notice to detach if assignment was just submitted
    await this.page.locator('text=/BR_PEER_001/i').first().waitFor({ state: 'detached', timeout: 5000 }).catch(() => null);

    if (await this.gradeAppealTab.isVisible()) {
      await this.gradeAppealTab.scrollIntoViewIfNeeded();
      await this.gradeAppealTab.click({ force: true });
    }

    const textarea = this.page.locator('textarea[placeholder*="Explain why"], textarea[placeholder*="reviewed by a TA"]').first();
    if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await textarea.fill(reason);
      const submitBtn = this.page.getByRole('button', { name: /Submit Appeal to TA/i });
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.scrollIntoViewIfNeeded();
        await submitBtn.click({ force: true });
      }
    }
  }
}




