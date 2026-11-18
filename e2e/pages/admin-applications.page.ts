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
    this.allTab = page.locator('button', { hasText: 'Tất cả đơn' }).first();
    this.pendingTab = page.locator('button', { hasText: 'Chờ thẩm định' }).first();
    this.approvedTab = page.locator('button', { hasText: 'Đã phê duyệt' }).first();
    this.rejectedTab = page.locator('button', { hasText: 'Đã từ chối' }).first();
    this.applicationCards = page.locator('div.bg-card.rounded-3xl');
  }

  async goto() {
    await this.page.goto('/admin/applications', { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('text=Đang tải danh sách đơn thẩm định').first()).toBeHidden({ timeout: 15000 });
  }

  async filterByStatus(status: 'all' | 'pending' | 'approved' | 'rejected') {
    const tab = status === 'pending' ? this.pendingTab : status === 'approved' ? this.approvedTab : status === 'rejected' ? this.rejectedTab : this.allTab;
    await expect(tab).toBeVisible({ timeout: 10000 });
    await expect(tab).toBeEnabled({ timeout: 5000 });

    await expect(async () => {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-pressed', 'true', { timeout: 2000 });
    }).toPass({ timeout: 10000 });
  }
}
