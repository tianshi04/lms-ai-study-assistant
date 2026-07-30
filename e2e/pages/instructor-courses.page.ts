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

  readonly deleteCourseButton: Locator;
  readonly analyticsLink: Locator;
  readonly announcementsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createCourseButton = page.getByRole('button', { name: /Soạn Khóa Học Mới|Create New Course|New Course/i });
    this.titleInput = page.locator('input[placeholder*="Tiêu đề"], form input[type="text"]').first();
    this.descriptionTextarea = page.locator('form textarea').first();
    this.submitCourseButton = page.locator('form button[type="submit"]');
    this.courseCards = page.locator('div.border.rounded-3xl');
    this.builderLinks = page.locator('a[href^="/instructor/courses/"]');
    this.learnerWarningNotice = page.locator('text=/Learner/i');
    this.deleteCourseButton = page.getByRole('button', { name: /Xóa/i }).first();
    this.analyticsLink = page.locator('a[href*="/analytics"]').first();
    this.announcementsLink = page.locator('a[href*="/announcements"]').first();
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
    await expect(this.titleInput).toBeVisible({ timeout: 10000 });
    await this.titleInput.fill(title);
    await this.descriptionTextarea.fill(description);
    await this.submitCourseButton.click();
  }

}
