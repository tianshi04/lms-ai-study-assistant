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

  async deleteCourse(title: string) {
    await this.goto();
    await this.verifyPageLoaded();
    const courseCard = this.page.locator('div.p-5').filter({ hasText: title }).first();
    await expect(courseCard).toBeVisible({ timeout: 10000 });
    const moreMenuTrigger = courseCard.getByRole('button', { name: 'Thao tác khóa học' });
    await expect(moreMenuTrigger).toBeVisible({ timeout: 5000 });
    await moreMenuTrigger.click();
    const deleteMenuItem = this.page.getByRole('menuitem', { name: /Xóa khóa học/i });
    await expect(deleteMenuItem).toBeVisible({ timeout: 5000 });
    await deleteMenuItem.click();
    const confirmDeleteButton = this.page.getByRole('button', { name: /Xóa khóa học/i });
    await expect(confirmDeleteButton).toBeVisible({ timeout: 5000 });
    await confirmDeleteButton.click();
    await expect(confirmDeleteButton).toBeHidden({ timeout: 5000 });
    await expect(this.page.locator('div.p-5').filter({ hasText: title })).toBeHidden({ timeout: 10000 });
  }
}

