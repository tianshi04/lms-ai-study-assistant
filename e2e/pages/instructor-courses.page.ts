import { Page, Locator, expect } from '@playwright/test';

export class InstructorCoursesPage {
  readonly page: Page;
  readonly createCourseButton: Locator;
  readonly titleInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly submitCourseButton: Locator;
  readonly courseCards: Locator;
  readonly builderLinks: Locator;
  readonly learnerWarningNotice: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createCourseButton = page.getByRole('button', { name: /Soạn Khóa Học Mới/i });
    this.titleInput = page.locator('input[placeholder*="Tiêu đề"], form input[type="text"]').first();
    this.descriptionTextarea = page.locator('form textarea').first();
    this.submitCourseButton = page.getByRole('button', { name: /Lưu & Đăng Khóa Học|Cập Nhật Khóa Học/i });
    this.courseCards = page.locator('div.border.rounded-2xl');
    this.builderLinks = page.locator('a[href^="/instructor/courses/"]');
    this.learnerWarningNotice = page.locator('text=/Learner/i');
  }

  async goto() {
    await this.page.goto('/instructor/courses');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/instructor\/courses/);
    await expect(this.page.locator('body')).toBeVisible();
  }

  async createNewCourse(title: string, description: string) {
    await this.createCourseButton.click();
    await expect(this.titleInput).toBeVisible({ timeout: 5000 });
    await this.titleInput.fill(title);
    await this.descriptionTextarea.fill(description);
    await this.submitCourseButton.click();
  }
}
