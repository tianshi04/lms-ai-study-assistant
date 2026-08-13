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
    this.emptyStateMessage = page.locator('h3, p, div').filter({ hasText: 'Không tìm thấy khóa học phù hợp' }).first();
  }

  async goto() {
    await this.page.goto('/courses', { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/courses/);
    await expect(this.searchInput).toBeVisible();
    // Wait until at least 1 course card is rendered (after RPC finishes loading)
    await expect(this.courseCards.first()).toBeVisible({ timeout: 10000 });
    // Wait for React Client Component hydration
    await expect(this.page.locator('button', { hasText: 'Computer Science' }).first()).toBeEnabled({ timeout: 10000 });
    await this.page.waitForTimeout(500);
  }

  async search(query: string) {
    await expect(this.searchInput).toBeVisible({ timeout: 10000 });
    await expect(this.searchInput).toBeEnabled({ timeout: 5000 });
    await this.searchInput.focus();
    await this.searchInput.fill(query);
    await this.searchInput.evaluate((el: HTMLInputElement, val: string) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, query);
    await this.searchInput.blur();
    await expect(this.searchInput).toHaveValue(query, { timeout: 5000 });
    await this.page.waitForTimeout(1000);
  }

  async getCourseCardsCount(): Promise<number> {
    return await this.courseCards.count();
  }

  async clickFirstCourse() {
    await expect(this.courseCards.first()).toBeVisible({ timeout: 10000 });
    await this.courseCards.first().click({ force: true });
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
      await combobox.click();
      const labelMap: Record<string, RegExp> = {
        '': /Mặc định|Default/i,
        'rating': /Đánh giá cao nhất|Highest Rating/i,
        'popular': /Phổ biến nhất|Most Popular/i,
        'newest': /Mới nhất|Newest/i,
      };
      const optionMatcher = labelMap[sortValue] || new RegExp(sortValue, 'i');
      const optionLocator = this.page.getByRole('option', { name: optionMatcher });
      if (await optionLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
        await optionLocator.click();
        await this.page.waitForTimeout(500);
      }
    }
  }
}
