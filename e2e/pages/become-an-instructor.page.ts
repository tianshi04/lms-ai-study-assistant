import { Page, Locator, expect } from '@playwright/test';

export class BecomeAnInstructorPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly bioTextarea: Locator;
  readonly linkedinUrlInput: Locator;
  readonly cvUrlInput: Locator;
  readonly demoVideoUrlInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.locator('input[placeholder*="Chức danh"]');
    this.bioTextarea = page.locator('textarea[placeholder*="Mô tả quá trình"]');
    this.linkedinUrlInput = page.locator('input[placeholder*="linkedin.com"]');
    this.cvUrlInput = page.locator('input[placeholder*="drive.google.com"]');
    this.demoVideoUrlInput = page.locator('input[placeholder*="youtube.com"]');
    this.submitButton = page.getByRole('button', { name: /Gửi đơn xin cấp quyền Giảng viên|Gửi đơn/i });
    this.successMessage = page.locator('text=/Gửi Đơn Đăng Ký Thành Công|PENDING_REVIEW/i');
    this.errorMessage = page.locator('text=/không được để trống|vui lòng/i');
  }

  async goto() {
    await this.page.goto('/become-an-instructor', { waitUntil: 'networkidle' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/become-an-instructor/);
    await expect(this.page.locator('text=/Giảng Viên Cá Nhân/i').first()).toBeVisible({ timeout: 15000 });
  }

  async submitApplication(data: {
    title: string;
    bio: string;
    linkedinUrl?: string;
    cvUrl?: string;
    demoVideoUrl?: string;
  }) {
    await expect(this.titleInput).toBeVisible({ timeout: 10000 });
    await this.titleInput.fill(data.title);
    await this.bioTextarea.fill(data.bio);
    if (data.linkedinUrl) await this.linkedinUrlInput.fill(data.linkedinUrl);
    if (data.cvUrl) await this.cvUrlInput.fill(data.cvUrl);
    if (data.demoVideoUrl) await this.demoVideoUrlInput.fill(data.demoVideoUrl);

    await this.submitButton.click();
  }
}
