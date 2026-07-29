import { Page, Locator, expect } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly editProfileButton: Locator;
  readonly fullNameInput: Locator;
  readonly avatarUrlInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly profileNameHeader: Locator;

  readonly editForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editProfileButton = page.locator('button', { hasText: 'Chỉnh sửa hồ sơ' });
    this.editForm = page.locator('form').filter({ hasText: 'Lưu thay đổi' });
    this.fullNameInput = this.editForm.locator('input[type="text"]');
    this.avatarUrlInput = this.editForm.locator('input[type="url"]');
    this.saveButton = this.editForm.locator('button', { hasText: 'Lưu thay đổi' });
    this.cancelButton = this.editForm.locator('button', { hasText: 'Hủy' });
    this.profileNameHeader = page.locator('h1.text-2xl.font-bold');
  }

  async goto() {
    await this.page.goto('/auth/profile');
  }

  async verifyPageLoaded() {
    await expect(this.profileNameHeader).toBeVisible({ timeout: 10000 });
  }

  async editProfile(fullName: string, avatarUrl: string) {
    await this.editProfileButton.click();
    await this.fullNameInput.fill(fullName);
    await this.avatarUrlInput.fill(avatarUrl);
    await this.saveButton.click();
  }
}
