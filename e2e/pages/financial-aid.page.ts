import { Page, Locator, expect } from '@playwright/test';

export class FinancialAidPage {
  readonly page: Page;
  readonly courseSelect: Locator;
  readonly essayTextarea: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.courseSelect = page.locator('select');
    this.essayTextarea = page.locator('textarea');
    this.submitButton = page.getByRole('button', { name: /Gửi Đơn Xin Hỗ Trợ|Submit Financial Aid|Submit/i });
    this.successMessage = page.locator('text=/thành công|successfully/i');
  }

  async goto(courseId = 'course-new-test') {
    await this.page.goto(`/financial-aid?courseId=${courseId}`);
  }

  async gotoInstructorReview() {
    await this.page.goto('/instructor/financial-aid');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/financial-aid/);
    await expect(this.page.locator('body')).toBeVisible();
  }

  async submitApplication(essayText: string) {
    await expect(this.essayTextarea).toBeVisible({ timeout: 10000 });
    await this.essayTextarea.fill(essayText);
    await this.submitButton.click();
  }

  async switchStatusTab(status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') {
    const tabLabels = {
      ALL: /Tất cả|All/i,
      PENDING: /Chờ xét duyệt|Pending/i,
      APPROVED: /Đã phê duyệt|Approved/i,
      REJECTED: /Đã từ chối|Rejected/i,
    };
    await this.page.getByRole('button', { name: tabLabels[status] }).click();
  }

  async approveFirstApplication() {
    const approveBtn = this.page.getByRole('button', { name: /Phê duyệt|Approve/i }).first();
    await expect(approveBtn).toBeVisible({ timeout: 5000 });
    await approveBtn.click();
  }

  async rejectFirstApplication() {
    const rejectBtn = this.page.getByRole('button', { name: /Từ chối|Reject/i }).first();
    await expect(rejectBtn).toBeVisible({ timeout: 5000 });
    await rejectBtn.click();
  }
}

