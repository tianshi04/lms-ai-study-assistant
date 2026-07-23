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

    this.quizTab = page.getByRole('button', { name: /Graded Quiz \(80% Pass\)/i });
    this.labTab = page.getByRole('button', { name: /Auto-Graded Lab/i });
    this.peerTab = page.getByRole('button', { name: /Peer Review & Appeal/i });

    this.confirmHonorButton = page.getByRole('button', { name: /Confirm Honor Code/i });
    this.honorAgreedBadge = page.locator('text=/Honor Code Agreed/i');
    this.submitQuizButton = page.getByRole('button', { name: /Submit Graded Quiz/i });
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
  }
}
