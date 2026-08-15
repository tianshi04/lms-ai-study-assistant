import { Page, Locator, expect } from '@playwright/test';

export class MyPurchasesPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly tabAll: Locator;
  readonly tabCompleted: Locator;
  readonly tabPending: Locator;
  readonly tabExpired: Locator;
  readonly purchaseCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /Mua hàng của tôi|Lịch sử giao dịch/i });
    this.tabAll = page.locator('button, [role="button"]').filter({ hasText: /Tất cả đơn hàng/i });
    this.tabCompleted = page.locator('button, [role="button"]').filter({ hasText: /Đã mở khóa|Thành công/i });
    this.tabPending = page.locator('button, [role="button"]').filter({ hasText: /Đang chờ thanh toán|Chờ thanh toán/i });
    this.tabExpired = page.locator('button, [role="button"]').filter({ hasText: /Đã hết hạn|Hủy/i });
    this.purchaseCards = page.locator('main .space-y-4 > div');
  }

  async goto() {
    await this.page.goto('/my-purchases');
  }

  async verifyPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }
}

export class NotificationCenterPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly markAllAsReadButton: Locator;
  readonly categoryFilterTabs: Locator;
  readonly notificationItems: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1', { hasText: /Trung tâm Thông báo/i });
    this.markAllAsReadButton = page.getByRole('button', { name: /Đánh dấu tất cả đã đọc/i });
    this.categoryFilterTabs = page.locator('button').filter({ hasText: /Tất cả|Hệ thống|Học tập|Diễn đàn|Thông báo/i });
    this.notificationItems = page.locator('[role="article"], .space-y-3 > div');
  }

  async goto() {
    await this.page.goto('/notifications');
  }

  async verifyPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }
}

export class AccountSettingsPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly enterpriseKeyInput: Locator;
  readonly activateKeyButton: Locator;
  readonly fullNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /Cài đặt tài khoản|Thông tin cá nhân/i });
    this.enterpriseKeyInput = page.locator('input[placeholder*="UIT-XXXX-YYYY"]');
    this.activateKeyButton = page.getByRole('button', { name: /Kích hoạt suất học/i });
    this.fullNameInput = page.locator('input[placeholder*="Họ và tên"]');
  }

  async goto() {
    await this.page.goto('/account-settings');
  }

  async verifyPageLoaded() {
    await expect(this.page.locator('body')).toBeVisible({ timeout: 10000 });
  }

  async activateEnterpriseKey(key: string) {
    if (await this.enterpriseKeyInput.isVisible()) {
      await this.enterpriseKeyInput.fill(key);
      await this.activateKeyButton.click();
    }
  }
}
