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
    this.openModalButton = page.getByRole('button', { name: /Tạo chủ đề thảo luận mới/i }).first();
    this.modalTitleInput = page.locator('input[placeholder*="Tiêu đề"], input[name="title"]').first();
    this.modalContentInput = page.locator('textarea[placeholder*="Nội dung"], textarea[name="content"]').first();
    this.modalSubmitButton = page.getByRole('button', { name: /^Đăng bài$/i }).first();
    this.replyInput = page
      .locator('textarea[placeholder*="Nội dung"], textarea[placeholder*="thảo luận"], input[placeholder*="Trả lời"]')
      .first();
    this.submitReplyButton = page.getByRole('button', { name: /Đăng bài|Gửi phản hồi|Post Reply|Gửi/i }).first();
  }

  async goto() {
    await this.page.goto('/forum', { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/forum/);
    await expect(this.page.locator('body')).toBeVisible();
    await expect(this.openModalButton).toBeVisible({ timeout: 15000 });
  }

  async createNewThread(title: string, content: string) {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.openModalButton).toBeVisible({ timeout: 10000 });
    await expect(this.openModalButton).toBeEnabled({ timeout: 5000 });
    await this.openModalButton.click();
    if (!(await this.modalTitleInput.isVisible())) {
      await this.page.waitForTimeout(500);
      if (!(await this.modalTitleInput.isVisible())) {
        await this.openModalButton.click({ force: true });
      }
    }

    await expect(this.modalTitleInput).toBeVisible({ timeout: 15000 });
    await this.modalTitleInput.fill(title);
    await expect(this.modalTitleInput).toHaveValue(title, { timeout: 5000 });
    await this.modalContentInput.fill(content);
    await expect(this.modalContentInput).toHaveValue(content, { timeout: 5000 });
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

