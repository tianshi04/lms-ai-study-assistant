import { Page, Locator, expect } from '@playwright/test';

export class CourseCatalogPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly courseCards: Locator;
  readonly emptyStateMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('main').locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]');
    this.courseCards = page.locator('a[href^="/courses/"]');
    this.emptyStateMessage = page.locator('text=/Không tìm thấy khóa học phù hợp|No matching courses found/i');
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

  async filterBySubject(subjectName: string) {
    const responsePromise = this.page.waitForResponse(response => response.url().includes('ListCourses'));
    await this.page.getByRole('button', { name: subjectName, exact: true }).click();
    await responsePromise;
  }

  async filterByLevel(levelName: string) {
    const responsePromise = this.page.waitForResponse(response => response.url().includes('ListCourses'));
    await this.page.getByRole('button', { name: levelName, exact: true }).click();
    await responsePromise;
  }

  async sortBy(sortValue: string) {
    const responsePromise = this.page.waitForResponse(response => response.url().includes('ListCourses'));
    await this.page.getByRole('combobox').click();
    await this.page.waitForTimeout(300);
    const labelMap: Record<string, RegExp> = {
      '': /Mặc định|Default/i,
      'rating': /Đánh giá cao nhất|Highest Rating/i,
      'popular': /Phổ biến nhất|Most Popular/i,
      'newest': /Mới nhất|Newest/i,
    };
    const optionMatcher = labelMap[sortValue] || new RegExp(sortValue, 'i');
    await this.page.getByRole('option', { name: optionMatcher }).click();
    await responsePromise;
  }
}
