import { Page, Locator, expect } from '@playwright/test';

export class CourseBuilderPage {
  readonly page: Page;
  readonly addWeekButton: Locator;
  readonly weekTitleInput: Locator;
  readonly weekSummaryTextarea: Locator;
  readonly submitWeekButton: Locator;
  readonly addLessonButton: Locator;
  readonly addLearningItemButton: Locator;

  readonly deleteWeekButton: Locator;
  readonly deleteLessonButton: Locator;
  readonly analyticsLink: Locator;
  readonly announcementsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addWeekButton = page.getByRole('button', { name: /Thêm Tuần học/i });
    this.weekTitleInput = page.locator('input[placeholder*="Neural Networks"]');
    this.weekSummaryTextarea = page.locator('div.fixed form textarea, form textarea').first();
    this.submitWeekButton = page.getByRole('button', { name: /Xác nhận tạo Tuần học/i });
    this.addLessonButton = page.getByRole('button', { name: /Thêm Bài học/i }).first();
    this.addLearningItemButton = page.getByRole('button', { name: /Thêm Học liệu/i }).first();
    this.deleteWeekButton = page.getByRole('button', { name: /Xóa Tuần/i }).first();
    this.deleteLessonButton = page.getByRole('button', { name: /Xóa Bài/i }).first();
    this.analyticsLink = page.getByRole('link', { name: /Thống kê lớp học/i });
    this.announcementsLink = page.getByRole('link', { name: /Đăng Thông báo/i });
  }

  async goto(courseId: string) {
    await this.page.goto(`/instructor/courses/${courseId}`);
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/instructor\/courses\/.+/);
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.addWeekButton).toBeVisible();
  }

  async createWeekModule(title: string, summary: string) {
    await this.addWeekButton.click();
    await expect(this.weekTitleInput).toBeVisible({ timeout: 5000 });
    await this.weekTitleInput.fill(title);
    if (await this.weekSummaryTextarea.isVisible()) {
      await this.weekSummaryTextarea.fill(summary);
    }
    await this.submitWeekButton.click();
  }

}
