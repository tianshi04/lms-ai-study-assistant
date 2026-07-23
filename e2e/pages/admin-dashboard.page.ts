import { Page, Locator, expect } from '@playwright/test';

export class AdminDashboardPage {
  readonly page: Page;
  readonly assignSeatButton: Locator;
  readonly createSeatKeyButton: Locator;
  readonly seatsList: Locator;

  // Modal elements for seat key creation
  readonly partnerNameInput: Locator;
  readonly seatKeyInput: Locator;
  readonly submitCreateSeatButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createSeatKeyButton = page.getByRole('button', { name: /Tạo Mã Enterprise Mới/i });
    this.assignSeatButton = page.getByRole('button', { name: /Gán Suất học cho Học viên/i });

    this.partnerNameInput = page.locator('input[placeholder*="Bách Khoa"]');
    this.seatKeyInput = page.locator('input[placeholder*="BKTPHCM"]');
    this.submitCreateSeatButton = page.getByRole('button', { name: /Xác nhận tạo Giấy phép/i });
    this.seatsList = page.locator('div.border.rounded-2xl');
  }

  async goto() {
    await this.page.goto('/admin/dashboard');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/admin\/dashboard/);
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.createSeatKeyButton).toBeVisible({ timeout: 10000 });
  }

  async createNewSeatKey(partnerName: string, seatKey: string) {
    await this.createSeatKeyButton.click();
    await expect(this.partnerNameInput).toBeVisible({ timeout: 5000 });
    await this.partnerNameInput.fill(partnerName);
    await this.seatKeyInput.fill(seatKey);
    await this.submitCreateSeatButton.click();
  }
}
