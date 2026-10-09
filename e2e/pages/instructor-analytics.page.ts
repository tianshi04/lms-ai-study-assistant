import { Page, Locator, expect } from '@playwright/test';

export class InstructorAnalyticsPage {
  readonly page: Page;
  readonly totalStudentsCard: Locator;
  readonly completionRateCard: Locator;
  readonly studentTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.totalStudentsCard = page.locator('text=/Tổng Học Viên/i');
    this.completionRateCard = page.locator('text=/Tỷ Lệ Hoàn Thành/i');
    this.studentTable = page.locator('table');
  }

  async goto(courseId: string) {
    await this.page.goto(`/instructor/courses/${courseId}/analytics`, { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/instructor\/courses\/.+\/analytics/);
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.totalStudentsCard).toBeVisible({ timeout: 15000 });
  }
}
