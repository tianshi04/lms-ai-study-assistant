import { Page, Locator, expect } from '@playwright/test';

export class PaymentPage {
  readonly page: Page;
  readonly upgradeButton: Locator;
  readonly checkoutModal: Locator;
  readonly singlePurchaseOption: Locator;
  readonly monthlySubscriptionOption: Locator;
  readonly yearlySubscriptionOption: Locator;
  readonly submitPaymentButton: Locator;
  readonly cancelButton: Locator;
  readonly paidModeBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.upgradeButton = page.locator('button:has-text("Nâng Cấp Paid Mode"), button:has-text("Coursera Plus")').first();
    this.checkoutModal = page.locator('text=/Nâng Cấp Quyền Truy Cập Paid Mode/i').first();
    this.singlePurchaseOption = page.locator('text=/Mua Lẻ Khóa/i').first();
    this.monthlySubscriptionOption = page.locator('text=/Gói Theo Tháng/i').first();
    this.yearlySubscriptionOption = page.locator('text=/Gói Theo Năm/i').first();
    this.submitPaymentButton = page.locator('button:has-text("Thanh Toán Ngay")').first();
    this.cancelButton = page.locator('button:has-text("Hủy bỏ")').first();
    this.paidModeBadge = page.locator('text=/Đã Mở Khóa Đầy Đủ|Paid Mode/i').first();
  }

  async openCheckoutModal() {
    await expect(this.upgradeButton).toBeVisible({ timeout: 10000 });
    await this.upgradeButton.click();
    await expect(this.checkoutModal).toBeVisible({ timeout: 5000 });
  }

  async selectSinglePurchase() {
    await this.singlePurchaseOption.click();
  }

  async selectMonthlySubscription() {
    await this.monthlySubscriptionOption.click();
  }

  async selectYearlySubscription() {
    await this.yearlySubscriptionOption.click();
  }

  async confirmCheckout() {
    await expect(this.submitPaymentButton).toBeEnabled();
    await this.submitPaymentButton.click();
  }

  async verifyPaymentSuccess() {
    await expect(this.page.locator('text=/thành công|Chúc mừng/i').first()).toBeVisible({ timeout: 10000 });
  }
}
