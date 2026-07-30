import { Page, Locator, expect } from '@playwright/test';

export interface UpdateInstructorProfileData {
  title?: string;
  signatureImageUrl?: string;
}

export class InstructorProfilePage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly titleInput: Locator;
  readonly signatureImageUrlInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1', { hasText: 'Cấu hình Hồ sơ & Chữ ký tay Điện tử' });
    this.titleInput = page.locator('input[placeholder*="PGS.TS"]');
    this.signatureImageUrlInput = page.locator('input[placeholder*="signature.png"]');
    this.submitButton = page.locator('button[type="submit"]', { hasText: 'Lưu Hồ sơ Giảng viên' });
  }

  async goto() {
    await this.page.goto('/instructor/profile');
  }

  async verifyPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  async updateProfile(data: UpdateInstructorProfileData) {
    if (data.title !== undefined) {
      await this.titleInput.fill(data.title);
    }
    if (data.signatureImageUrl !== undefined) {
      await this.signatureImageUrlInput.fill(data.signatureImageUrl);
    }
    await this.submitButton.click();
    await expect(this.page.locator('text=/Cập nhật chức danh và chữ ký tay điện tử thành công|Cập nhật chức danh và chữ ký/i')).toBeVisible({ timeout: 15000 });
  }
}
