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
    this.heading = page.locator('h1', { hasText: 'Quản Lý Thẩm Định Đơn Giảng Viên' });
    this.allTab = page.locator('button', { hasText: 'Tất cả đơn' });
    this.pendingTab = page.locator('button', { hasText: 'Chờ thẩm định' });
    this.approvedTab = page.locator('button', { hasText: 'Đã phê duyệt' });
    this.rejectedTab = page.locator('button', { hasText: 'Đã từ chối' });
    this.applicationCards = page.locator('div.bg-white.dark\\:bg-slate-900.rounded-3xl');
  }

  async goto() {
    await this.page.goto('/admin/applications');
  }

  async verifyPageLoaded() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  async filterByStatus(status: 'all' | 'pending' | 'approved' | 'rejected') {
    if (status === 'pending') await this.pendingTab.click();
    else if (status === 'approved') await this.approvedTab.click();
    else if (status === 'rejected') await this.rejectedTab.click();
    else await this.allTab.click();
  }
}
