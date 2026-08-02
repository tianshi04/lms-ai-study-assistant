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
    this.roleSelect = page.locator('select, button:has-text("vai trò"), button:has-text("Learner"), button:has-text("Học viên")').first();
    this.submitButton = page.getByRole('button', { name: /đăng ký ngay|register now/i });
    this.errorBanner = page.locator('div.bg-rose-50, div.bg-rose-500\\/10, div.border-rose-200, div.border-rose-900\\/50, [role="status"], [role="alert"]').first();
    this.successBanner = page.locator('div.bg-emerald-50, div.bg-emerald-500\\/10, div.border-emerald-200, div.border-emerald-900\\/50, [data-type="success"], div[role="status"]:not([id="__next-route-announcer__"]), div[role="alert"]:not([id="__next-route-announcer__"])').first();
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

    const hasNativeSelect = (await this.page.locator('select').count()) > 0;
    if (hasNativeSelect) {
      await this.page.locator('select').first().selectOption(roleValue);
    } else {
      const trigger = this.roleSelect;
      if (await trigger.isVisible()) {
        await trigger.click();
        const optionPattern =
          roleValue === '2' || roleValue === 'INSTRUCTOR'
            ? /Giảng viên/i
            : roleValue === '3' || roleValue === 'TA'
              ? /Trợ giảng/i
              : /Học viên/i;
        const option = this.page.locator('[role="option"], [data-value]').filter({ hasText: optionPattern }).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
        }
      }
    }
    await this.submitButton.click();
  }
}
