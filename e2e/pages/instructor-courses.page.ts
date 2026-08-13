import { Page, Locator, expect } from '@playwright/test';
import { NewCoursePage } from './new-course.page';

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
    this.createCourseButton = page.locator('a[href="/instructor/courses/new"], button:has-text("Soạn Khóa Học Mới")').first();
    this.titleInput = page.getByPlaceholder(/Ví dụ: Lập trình/i).first();
    this.descriptionTextarea = page.getByPlaceholder(/Tóm tắt những kiến thức/i).first();
    this.submitCourseButton = page.getByRole('button', { name: /Bắt Đầu Tạo Khóa Học|Tạo Khóa Học/i }).first();
    this.courseCards = page.locator('div.border.rounded-3xl');
    this.builderLinks = page.locator('a[href^="/instructor/courses/"]');
    this.learnerWarningNotice = page.locator('text=/Learner/i');
    this.deleteCourseButton = page.getByRole('button', { name: /Xóa/i }).first();
    this.analyticsLink = page.locator('a[href*="/analytics"]').first();
    this.announcementsLink = page.locator('a[href*="/announcements"]').first();
  }

  async goto() {
    await this.page.goto('/instructor/courses', { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/instructor\/courses/);
    await expect(this.page.locator('body')).toBeVisible();
  }

  async createNewCourse(title: string, description: string) {
    const newCoursePage = new NewCoursePage(this.page);
    await newCoursePage.goto();
    await newCoursePage.verifyPageLoaded();
    await newCoursePage.fillAndSubmitCourse(title, description);
  }
}
