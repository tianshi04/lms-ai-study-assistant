import { Page, Locator, expect } from '@playwright/test';

export class TAGradingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly allSubmissionsTab: Locator;
  readonly pendingTab: Locator;
  readonly appealedTab: Locator;
  readonly gradedTab: Locator;
  readonly firstGradeButton: Locator;
  readonly gradeModalTitle: Locator;
  readonly scoreInput: Locator;
  readonly submitGradeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1:has-text("Quản Lý Chấm Điểm & Kháng Nghị Bài Tập")');
    this.allSubmissionsTab = page.locator('button:has-text("Tất cả bài nộp")');
    this.pendingTab = page.locator('button:has-text("Chờ trợ giảng chấm")');
    this.appealedTab = page.locator('button:has-text("Có đơn kháng nghị")');
    this.gradedTab = page.locator('button:has-text("Đã hoàn thành")');
    this.firstGradeButton = page.locator('button:has-text("Chấm điểm ngay"), button:has-text("Xem & Sửa điểm")').first();
    this.gradeModalTitle = page.locator('h2:has-text("Chấm Điểm Bài Tập Tự Luận")');
    this.scoreInput = page.locator('input[type="number"]');
    this.submitGradeButton = page.locator('button:has-text("Lưu & Xác Nhận Điểm Trợ Giảng")');
  }

  async goto() {
    await this.page.goto('/ta/grading');
  }

  async verifyPageLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 15000 });
    await expect(this.allSubmissionsTab).toBeVisible();
  }

  async openFirstSubmissionGradeModal() {
    await this.firstGradeButton.click();
    await expect(this.gradeModalTitle).toBeVisible({ timeout: 5000 });
  }

  async submitGrade(score: number) {
    await this.scoreInput.fill(String(score));
    await this.submitGradeButton.click();
  }
}
