import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Prefer user-facing roles and labels, fallback to placeholders/test-ids
    this.emailInput = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).or(page.locator('input[type="email"]'));
    this.passwordInput = page.getByLabel(/password|mật khẩu/i).or(page.getByPlaceholder(/password|mật khẩu/i)).or(page.locator('input[type="password"]'));
    this.submitButton = page.getByRole('button', { name: /login|sign in|đăng nhập/i });
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  async verifyPageLoaded() {
    await expect(this.page.locator('body')).toBeVisible();
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }
}
