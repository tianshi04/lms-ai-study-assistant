import { Page, Locator, expect } from '@playwright/test';

export class CourseCatalogPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly courseCards: Locator;
  readonly emptyStateMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="Tìm kiếm khóa học"]');
    this.courseCards = page.locator('a[href^="/courses/"]');
    this.emptyStateMessage = page.locator('text=/Không tìm thấy khóa học/i');
  }

  async goto() {
    await this.page.goto('/courses');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/courses/);
    await expect(this.searchInput).toBeVisible();
    // Wait until at least 1 course card is rendered (after RPC finishes loading)
    await expect(this.courseCards.first()).toBeVisible({ timeout: 10000 });
  }

  async search(query: string) {
    await this.searchInput.fill(query);
  }

  async getCourseCardsCount(): Promise<number> {
    return await this.courseCards.count();
  }

  async clickFirstCourse() {
    await expect(this.courseCards.first()).toBeVisible({ timeout: 10000 });
    await this.courseCards.first().click();
  }
}
