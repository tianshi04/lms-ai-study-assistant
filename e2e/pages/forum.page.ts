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
    this.openModalButton = page.getByRole('button', { name: 'Tạo chủ đề thảo luận mới' });
    this.modalTitleInput = page.locator('div.z-modal input[placeholder*="Tiêu đề"], input[placeholder*="Tiêu đề"]').first();
    this.modalContentInput = page.locator('div[role="dialog"] textarea, textarea[placeholder*="Nội dung thắc mắc"]').first();
    this.modalSubmitButton = page.getByRole('button', { name: /^Đăng bài$/i }).first();
    this.replyInput = page
      .locator('textarea[placeholder*="Nội dung thắc mắc"], textarea[placeholder*="thảo luận"], input[placeholder*="Trả lời"]')
      .first();
    this.submitReplyButton = page.getByRole('button', { name: /Đăng bài|Gửi phản hồi|Post Reply|Gửi/i }).first();
  }

  async goto() {
    await this.page.goto('/forum', { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/forum/);
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.openModalButton).toBeVisible();
  }

  async createNewThread(title: string, content: string) {
    await expect(this.openModalButton).toBeVisible({ timeout: 10000 });
    await expect(this.openModalButton).toBeEnabled({ timeout: 5000 });

    for (let i = 0; i < 3; i++) {
      await this.openModalButton.click();
      await this.page.waitForTimeout(400);
      if (await this.modalTitleInput.isVisible()) break;
    }

    await expect(this.modalTitleInput).toBeVisible({ timeout: 15000 });
    await this.modalTitleInput.fill(title);
    await this.modalContentInput.fill(content);
    await this.page.waitForTimeout(300);
    await expect(this.modalSubmitButton).toBeEnabled({ timeout: 10000 });
    await this.modalSubmitButton.click();
    await expect(this.modalTitleInput).toBeHidden({ timeout: 10000 });
  }

  async postFirstReply(replyContent: string) {
    if (!(await this.replyInput.isVisible())) {
      const replyTrigger = this.page
        .locator('button')
        .filter({ hasText: /Nội dung thắc mắc|thảo luận chi tiết|Write your detailed question/i })
        .first();
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

