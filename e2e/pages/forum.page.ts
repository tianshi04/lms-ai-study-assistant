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
    this.openModalButton = page.getByRole('button', { name: /^(Tạo chủ đề thảo luận mới|Tạo Thảo Luận Mới|Create New Discussion Thread|New Thread)$/i });
    this.modalTitleInput = page.locator('input[placeholder*="Loss Function"], input[placeholder*="Title"], input[placeholder*="Tiêu đề"]');
    this.modalContentInput = page.locator('textarea[placeholder*="Mô tả"], textarea[placeholder*="Write"], textarea[placeholder*="Content"], textarea[placeholder*="Nội dung thắc mắc"]').last();
    this.modalSubmitButton = page.getByRole('button', { name: /^(Đăng bài|Đăng Thảo Luận|Post Thread|Post)$/i });
    this.replyInput = page.locator('textarea[placeholder*="Nội dung thắc mắc"], textarea[placeholder*="Nhập câu trả lời"], textarea[placeholder*="Write"], input[placeholder*="Trả lời"]').first();
    this.submitReplyButton = page.getByRole('button', { name: /Đăng bài|Post Thread|Gửi Phản Hồi|Gửi|Reply/i }).first();
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
    if (!(await this.replyInput.isVisible())) {
      const replyTrigger = this.page.locator('button').filter({ hasText: /Nội dung thắc mắc|Write your detailed question/i }).first();
      if (await replyTrigger.isVisible()) {
        await replyTrigger.click();
      }
    }
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

