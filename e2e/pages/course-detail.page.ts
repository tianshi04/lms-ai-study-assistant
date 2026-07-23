import { Page, Locator, expect } from '@playwright/test';

export class CourseDetailPage {
  readonly page: Page;
  readonly courseTitle: Locator;
  readonly partnerName: Locator;
  readonly enrollButton: Locator;
  readonly syllabusHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.courseTitle = page.locator('h1');
    this.partnerName = page.locator('text=/Đối tác phát hành/i').locator('xpath=following-sibling::span');
    this.enrollButton = page.getByRole('link', { name: /vào học ngay/i });
    this.syllabusHeading = page.getByRole('heading', { name: /Nội Dung Chương Trình Học/i });
  }

  async goto(courseId: string) {
    await this.page.goto(`/courses/${courseId}`);
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/courses\/.+/);
    await expect(this.courseTitle).toBeVisible();
    await expect(this.enrollButton).toBeVisible();
    await expect(this.syllabusHeading).toBeVisible();
  }

  async clickEnroll() {
    await this.enrollButton.click();
  }
}
