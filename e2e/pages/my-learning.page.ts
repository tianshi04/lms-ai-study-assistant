import { type Page, type Locator, expect } from '@playwright/test';

export class MyLearningPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: 'Việc học của tôi' }).first();
  }

  async goto() {
    await this.page.goto('/my-learning', { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }
}
