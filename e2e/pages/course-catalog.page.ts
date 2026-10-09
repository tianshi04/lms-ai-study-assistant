import { Page, Locator, expect } from '@playwright/test';

export class CourseCatalogPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly courseCards: Locator;
  readonly emptyStateMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="Tìm kiếm"], input[placeholder*="Search"]').first();
    this.courseCards = page.locator('a[href^="/courses/"]');
    this.emptyStateMessage = page.locator('h3, p, div').filter({ hasText: /Không tìm thấy khóa học|Không tìm thấy kết quả|Vui lòng thử từ khóa khác/i }).first();
  }

  async goto() {
    await this.page.goto('/courses', { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/courses/);
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
    // Wait until at least 1 course card is rendered (after RPC finishes loading)
    await expect(this.courseCards.first()).toBeVisible({ timeout: 15000 });
  }

  async search(query: string) {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
    await expect(this.searchInput).toBeEnabled({ timeout: 5000 });
    await this.searchInput.click();
    await this.searchInput.fill(query);
    await expect(this.searchInput).toHaveValue(query, { timeout: 10000 });
    // Wait for 500ms debounce + query resolution
    await this.page.waitForTimeout(1000);
  }

  async getCourseCardsCount(): Promise<number> {
    return await this.courseCards.count();
  }

  async clickFirstCourse() {
    await expect(this.courseCards.first()).toBeVisible({ timeout: 10000 });
    await this.courseCards.first().scrollIntoViewIfNeeded();
    await this.courseCards.first().click();
  }

  async filterBySubject(subjectName: string) {
    const btn = this.page.getByRole('button', { name: subjectName, exact: true });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async filterByLevel(levelName: string) {
    const btn = this.page.getByRole('button', { name: levelName, exact: true });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(500);
    }
  }

  async sortBy(sortValue: string) {
    const combobox = this.page.getByRole('combobox');
    if (await combobox.isVisible().catch(() => false)) {
      const isExpanded = (await combobox.getAttribute('aria-expanded')) === 'true';
      if (!isExpanded) {
        await combobox.click();
      }
      const labelMap: Record<string, RegExp> = {
        '': /Mặc định|Default/i,
        'rating': /Đánh giá cao nhất|Highest Rating/i,
        'popular': /Phổ biến nhất|Most Popular/i,
        'newest': /Mới nhất|Newest/i,
      };
      const optionMatcher = labelMap[sortValue] || new RegExp(sortValue, 'i');
      const optionLocator = this.page.getByRole('option', { name: optionMatcher });
      if (await optionLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
        await optionLocator.click({ force: true });
        await expect(this.courseCards.first()).toBeVisible({ timeout: 10000 });
      }
    }
  }
}
