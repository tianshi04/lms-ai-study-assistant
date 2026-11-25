import { Page, Locator, expect } from '@playwright/test';

const SAMPLE_SIGNATURE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export interface UpdateInstructorProfileData {
  title?: string;
  signatureImageUrl?: string;
}

export class InstructorProfilePage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly titleInput: Locator;
  readonly signatureFileInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1', { hasText: 'Cấu hình Hồ sơ & Chữ ký tay Điện tử' });
    this.titleInput = page.locator('input[placeholder*="PGS.TS"]');
    this.signatureFileInput = page.locator('#signatureImageUrl');
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
      await this.signatureFileInput.setInputFiles({
        name: 'signature.png',
        mimeType: 'image/png',
        buffer: SAMPLE_SIGNATURE_PNG,
      });
      await expect(this.page.getByText('Đã tải lên ảnh chữ ký', { exact: true })).toBeVisible({ timeout: 15000 });
    }
    await this.submitButton.click();
    await expect(this.page.locator('text=/Cập nhật chức danh và chữ ký tay điện tử thành công|Cập nhật chức danh và chữ ký/i')).toBeVisible({ timeout: 15000 });
  }
}
