import { Page, Locator, expect } from '@playwright/test';

export class InstructorAnnouncementsPage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly contentTextarea: Locator;
  readonly submitButton: Locator;
  readonly announcementCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.locator('input[placeholder*="Cập nhật"], form input[type="text"]').first();
    this.contentTextarea = page.locator('form textarea').first();
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
    await expect(this.titleInput).toBeVisible({ timeout: 10000 });
    await expect(this.titleInput).toBeEnabled({ timeout: 5000 });

    await this.titleInput.click();
    await this.titleInput.fill(title);
    await this.titleInput.blur();
    await expect(this.titleInput).toHaveValue(title, { timeout: 5000 });

    await this.contentTextarea.click();
    await this.contentTextarea.fill(content);
    await this.contentTextarea.blur();
    await expect(this.contentTextarea).toHaveValue(content, { timeout: 5000 });
    await this.page.waitForTimeout(300);

    await expect(this.submitButton).toBeEnabled({ timeout: 5000 });
    await this.submitButton.click();
  }
}
