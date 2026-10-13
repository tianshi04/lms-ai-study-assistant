import { Page, Locator, expect } from '@playwright/test';

/**
 * Registration is Google-verified (step 1 happens on accounts.google.com, step 2 on this page
 * after the OAuth callback). There is intentionally NO mock/bypass here: real Google sign-in
 * cannot be automated, so tests only cover what the app controls (the outgoing authorization
 * request and the fail-closed callback).
 */
export class RegisterPage {
  readonly page: Page;
  readonly googleButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.googleButton = page.getByRole('button', { name: /google/i }).first();
    this.loginLink = page.getByRole('link', { name: /đăng nhập tại đây|sign in here/i });
  }

  async goto() {
    await this.page.goto('/auth/register');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/auth\/register/);
    await expect(this.googleButton).toBeVisible();
  }
}
