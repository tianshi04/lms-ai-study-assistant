import { Page, Locator, expect } from '@playwright/test';

export class ForgotPasswordPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly googleAuthButton: Locator;
  readonly backToLoginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1, h2, h3').filter({ hasText: /Quên mật khẩu/i });
    this.googleAuthButton = page.locator('main button, main [role="button"]').first();
    this.backToLoginLink = page.getByRole('link', { name: /Quay lại Đăng nhập/i });
  }

  async goto() {
    await this.page.goto('/auth/forgot-password');
  }

  async verifyPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }
}
