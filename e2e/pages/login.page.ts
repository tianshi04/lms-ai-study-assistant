import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.getByRole('button', { name: /đăng nhập ngay/i });
    this.errorBanner = page.locator('div.bg-rose-50, div.bg-rose-500\\/10');
    this.registerLink = page.getByRole('link', { name: /đăng ký miễn phí/i });
  }

  async goto(redirectUrl?: string) {
    const target = redirectUrl ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/login';
    await this.page.goto(target);
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/auth\/login/);
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }
}
