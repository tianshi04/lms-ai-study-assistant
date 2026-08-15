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
    this.submitButton = page.getByRole('button', { name: /đăng nhập ngay|sign in/i });
    this.errorBanner = page.getByRole('alert').or(page.getByRole('status')).first();
    this.registerLink = page.locator('a[href="/auth/register"]');
  }

  async goto(redirectUrl?: string) {
    const target = redirectUrl ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/login';
    await this.page.goto(target);
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
    await expect(this.passwordInput).toBeVisible({ timeout: 10000 });
    await expect(this.submitButton).toBeVisible({ timeout: 10000 });
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }
}
