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
    this.submitButton = page.getByRole('button', { name: /Gửi Đơn Xin Hỗ Trợ/i });
    this.successMessage = page.locator('text=/thành công/i');
  }

  async goto(courseId = 'course-new-test') {
    await this.page.goto(`/financial-aid?courseId=${courseId}`);
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
}
