import { Page, Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly googleButton: Locator;
  readonly fullNameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly roleSelect: Locator;
  readonly submitButton: Locator;
  readonly successBanner: Locator;
  readonly errorBanner: Locator;
  readonly loginLink: Locator;
  readonly verifiedEmailBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    // Step 1: Google verification button
    this.googleButton = page.getByRole('button', { name: /xác minh bằng google|tiếp tục với google/i });
    // Step 2: Form fields (visible only after Google verification)
    this.fullNameInput = page.locator('input[placeholder*="Nguyễn Văn A"], input[placeholder*="John"], input[autocomplete="name"], form input[type="text"]').first();
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.roleSelect = page.locator('select, button:has-text("vai trò"), button:has-text("Learner"), button:has-text("Học viên")').first();
    this.submitButton = page.getByRole('button', { name: /hoàn tất đăng ký|đăng ký ngay|register now/i });
    this.errorBanner = page.locator('div.bg-rose-50, div.bg-rose-500\\/10, div.border-rose-200, div.border-rose-900\\/50, [role="status"], [role="alert"]').first();
    this.successBanner = page.locator('div.bg-emerald-50, div.bg-emerald-500\\/10, div.border-emerald-200, div.border-emerald-900\\/50, [data-type="success"], div[role="status"]:not([id="__next-route-announcer__"]), div[role="alert"]:not([id="__next-route-announcer__"])').first();
    this.loginLink = page.getByRole('link', { name: /đăng nhập tại đây|sign in here/i });
    this.verifiedEmailBanner = page.getByText(/Email đã xác minh/i).first();
  }

  async goto() {
    await this.page.goto('/auth/register');
    // Intercept Google OAuth window.open in local dev environment where Google Client ID is configured
    await this.page.evaluate(() => {
      const origOpen = window.open;
      window.open = function (url: string | URL | undefined, name?: string, specs?: string) {
        const urlStr = String(url || '');
        if (urlStr.includes('accounts.google.com')) {
          const email = window.prompt(
            'Dev Mode: Nhập địa chỉ Gmail để giả lập xác minh Google',
            'user.test@gmail.com',
          );
          if (email && email.includes('@')) {
            const mockToken = `mock_google_${email.trim()}_${email.split('@')[0]}`;
            window.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', idToken: mockToken }, '*');
          }
          return null;
        }
        return origOpen.call(window, urlStr, name, specs);
      };
    });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/auth\/register/);
    // Step 1 shows Google button, not form inputs
    await expect(this.googleButton).toBeVisible({ timeout: 5000 });
  }

  /**
   * Full 2-step registration flow:
   * Step 1: Click Google button → handle dev-mode prompt dialog → wait for step 2
   * Step 2: Fill form (name, password, confirm, role) → submit
   */
  async register(fullName: string, email: string, pass: string, roleValue = '1') {
    // Step 1: Handle Google verification via dev-mode prompt dialog
    this.page.once('dialog', (dialog) => {
      dialog.accept(email).catch(() => null);
    });
    await this.googleButton.click();

    // Wait for Step 2 to appear (verified email banner + form fields)
    await expect(this.verifiedEmailBanner).toBeVisible({ timeout: 15000 });
    await expect(this.fullNameInput).toBeVisible({ timeout: 5000 });

    // Step 2: Fill the registration form
    await this.fullNameInput.fill(fullName);
    await this.passwordInput.fill(pass);
    await this.confirmPasswordInput.fill(pass);

    // Handle role selection
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
