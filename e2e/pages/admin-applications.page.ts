import { type Page, type Locator, expect } from '@playwright/test';

export class AdminApplicationsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly allTab: Locator;
  readonly pendingTab: Locator;
  readonly approvedTab: Locator;
  readonly rejectedTab: Locator;
  readonly applicationCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1', { hasText: 'Quản Lý Thẩm Định Đơn Giảng Viên' }).first();
    this.allTab = page.locator('button', { hasText: 'Tất cả đơn' });
    this.pendingTab = page.locator('button', { hasText: 'Chờ thẩm định' });
    this.approvedTab = page.locator('button', { hasText: 'Đã phê duyệt' });
    this.rejectedTab = page.locator('button', { hasText: 'Đã từ chối' });
    this.applicationCards = page.locator('div.bg-card.rounded-3xl');
  }

  async goto() {
    await this.page.goto('/admin/applications', { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  async filterByStatus(status: 'all' | 'pending' | 'approved' | 'rejected') {
    const tab = status === 'pending' ? this.pendingTab : status === 'approved' ? this.approvedTab : status === 'rejected' ? this.rejectedTab : this.allTab;
    await expect(tab).toBeVisible({ timeout: 10000 });
    await expect(tab).toBeEnabled({ timeout: 5000 });

    for (let i = 0; i < 3; i++) {
      await tab.click();
      await this.page.waitForTimeout(400);
      if ((await tab.getAttribute('aria-pressed')) === 'true') break;
    }

    await expect(tab).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });
  }
}
