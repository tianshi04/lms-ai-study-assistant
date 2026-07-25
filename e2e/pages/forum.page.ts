import { Page, Locator, expect } from '@playwright/test';

export class ForumPage {
  readonly page: Page;
  readonly openModalButton: Locator;
  readonly modalTitleInput: Locator;
  readonly modalContentInput: Locator;
  readonly modalSubmitButton: Locator;
  readonly replyInput: Locator;
  readonly submitReplyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openModalButton = page.getByRole('button', { name: /Tạo Thảo Luận Mới|Create|Discussion|New Thread/i });
    this.modalTitleInput = page.locator('input[placeholder*="Loss Function"], input[placeholder*="Title"], input[placeholder*="Tiêu đề"]');
    this.modalContentInput = page.locator('textarea[placeholder*="Mô tả"], textarea[placeholder*="Write"], textarea[placeholder*="Content"]').last();
    this.modalSubmitButton = page.getByRole('button', { name: /Đăng Thảo Luận|Post Thread|Post/i });
    this.replyInput = page.locator('textarea[placeholder*="Nhập câu trả lời"], textarea[placeholder*="Write"], input[placeholder*="Trả lời"]').first();
    this.submitReplyButton = page.getByRole('button', { name: /Gửi Phản Hồi|Gửi|Reply|Post/i }).first();
  }

  async goto() {
    await this.page.goto('/forum');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/forum/);
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.openModalButton).toBeVisible();
  }

  async createNewThread(title: string, content: string) {
    if (await this.openModalButton.isVisible()) {
      await this.openModalButton.click();
    }
    await expect(this.modalTitleInput).toBeVisible({ timeout: 5000 });
    await this.modalTitleInput.fill(title);
    await this.modalContentInput.fill(content);
    await this.modalSubmitButton.click();
  }

  async postFirstReply(replyContent: string) {
    await expect(this.replyInput).toBeVisible({ timeout: 5000 });
    await this.replyInput.fill(replyContent);
    await this.submitReplyButton.click();
  }

  async upvoteReply() {
    const upvoteBtn = this.page.locator('button:has-text("▲"), button:has-text("Upvote")').first();
    if (await upvoteBtn.isVisible()) {
      await upvoteBtn.click();
    }
  }
}

