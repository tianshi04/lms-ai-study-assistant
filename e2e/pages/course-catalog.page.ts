import { Page, Locator, expect } from '@playwright/test';

export class CourseCatalogPage {
  readonly page: Page;
  readonly pageHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1, h2').first();
  }

  async goto() {
    await this.page.goto('/courses');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/courses/);
    await expect(this.page.locator('body')).toBeVisible();
  }
}
