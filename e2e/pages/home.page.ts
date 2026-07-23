import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly mainHeading: Locator;
  readonly navCoursesLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.mainHeading = page.locator('h1').first();
    this.navCoursesLink = page.locator('a[href="/courses"]').first();
  }

  async goto() {
    await this.page.goto('/');
  }

  async verifyLoaded() {
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.mainHeading).toBeVisible();
  }

  async clickCoursesNavigation() {
    if (await this.navCoursesLink.isVisible()) {
      await this.navCoursesLink.click();
    } else {
      await this.page.goto('/courses');
    }
  }
}
