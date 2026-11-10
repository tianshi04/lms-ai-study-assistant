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
    await expect(this.page.locator('h1', { hasText: 'Thông báo Khóa học' }).first()).toBeVisible({ timeout: 15000 });
    await expect(this.page.locator('h2', { hasText: 'Lịch sử Thông báo' }).first()).toBeVisible({ timeout: 15000 });
    await expect(this.page.getByText('Đang tải danh sách thông báo').first()).toBeHidden({ timeout: 15000 });
  }

  async postAnnouncement(title: string, content: string) {
    await this.verifyPageLoaded();

    await expect(this.titleInput).toBeVisible({ timeout: 20000 });
    await expect(this.titleInput).toBeEnabled({ timeout: 10000 });

    await this.titleInput.click();
    await this.titleInput.fill(title);
    await this.contentTextarea.click();
    await this.contentTextarea.fill(content);

    // Guard against any late hydration re-renders resetting inputs
    for (let i = 0; i < 3; i++) {
      if ((await this.titleInput.inputValue()) !== title) {
        await this.titleInput.click();
        await this.titleInput.fill(title);
      }
      if ((await this.contentTextarea.inputValue()) !== content) {
        await this.contentTextarea.click();
        await this.contentTextarea.fill(content);
      }
      if ((await this.titleInput.inputValue()) === title && (await this.contentTextarea.inputValue()) === content) {
        break;
      }
      await this.page.waitForTimeout(300);
    }
    await expect(this.titleInput).toHaveValue(title, { timeout: 5000 });
    await expect(this.contentTextarea).toHaveValue(content, { timeout: 5000 });

    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    await this.submitButton.click();

    const successLocator = this.page.locator('text=Đã đăng thông báo khóa học thành công!').or(this.page.getByText(title)).first();
    await expect(successLocator).toBeVisible({ timeout: 20000 });
  }
}
