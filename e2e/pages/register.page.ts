import { Page, Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly roleSelect: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;
  readonly successBanner: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fullNameInput = page.locator('input[placeholder*="Nguyễn Văn A"], input[placeholder*="John"], input[autocomplete="name"], form input[type="text"]').first();
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.roleSelect = page.locator('select');
    this.submitButton = page.getByRole('button', { name: /đăng ký ngay|register now/i });
    this.errorBanner = page.locator('div.bg-rose-50, div.bg-rose-500\\/10, div.border-rose-200, div.border-rose-900\\/50, [role="status"], [role="alert"]');
    this.successBanner = page.locator('div.bg-emerald-50, div.bg-emerald-500\\/10, div.border-emerald-200, div.border-emerald-900\\/50, [role="status"], [role="alert"]');
    this.loginLink = page.getByRole('link', { name: /đăng nhập tại đây|sign in here/i });
  }

  async goto() {
    await this.page.goto('/auth/register');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/auth\/register/);
    await expect(this.fullNameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async register(fullName: string, email: string, pass: string, roleValue = '1') {
    await this.fullNameInput.fill(fullName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.roleSelect.selectOption(roleValue);
    await this.submitButton.click();
  }
}
