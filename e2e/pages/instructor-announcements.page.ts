import { Page, Locator, expect } from '@playwright/test';

export class InstructorAnnouncementsPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly contentTextarea: Locator;
  readonly submitButton: Locator;
  readonly announcementCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.locator('#announcementTitle, input[placeholder*="Cập nhật"]').first();
    this.contentTextarea = page.locator('#announcementContent, textarea[placeholder*="chi tiết"]').first();
    this.submitButton = page.getByRole('button', { name: /Đăng Thông báo Ngay/i });
    this.announcementCards = page.locator('div.rounded-3xl.p-6');
  }

  async goto(courseId: string) {
    await this.page.goto(`/instructor/courses/${courseId}/announcements`, { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/instructor\/courses\/.+\/announcements/);
    await expect(this.page.locator('body')).toBeVisible();
  }

  async postAnnouncement(title: string, content: string) {
    await this.page.waitForLoadState('domcontentloaded');

    // Wait until initial announcement query finishes loading to prevent re-render from wiping input values
    await expect(this.page.locator('text=Đang tải danh sách thông báo')).toBeHidden({ timeout: 15000 });

    await expect(this.titleInput).toBeVisible({ timeout: 20000 });
    await expect(this.titleInput).toBeEnabled({ timeout: 10000 });
    await this.page.waitForTimeout(300);

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.titleInput.click();
      await this.titleInput.fill(title);
      await this.page.waitForTimeout(200);
      if ((await this.titleInput.inputValue()) === title) break;
    }
    await expect(this.titleInput).toHaveValue(title, { timeout: 10000 });

    for (let attempt = 0; attempt < 3; attempt++) {
      await this.contentTextarea.click();
      await this.contentTextarea.fill(content);
      await this.page.waitForTimeout(200);
      if ((await this.contentTextarea.inputValue()) === content) break;
    }
    await expect(this.contentTextarea).toHaveValue(content, { timeout: 10000 });

    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    await this.page.waitForTimeout(300);
    await this.submitButton.click();

    const successLocator = this.page.locator('text=Đã đăng thông báo khóa học thành công!').or(this.page.getByText(title)).first();
    await expect(successLocator).toBeVisible({ timeout: 15000 });
  }
}
