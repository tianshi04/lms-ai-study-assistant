import { Page, Locator, expect } from '@playwright/test';

export class LearningPage {
  readonly page: Page;
  readonly headerTitle: Locator;
  readonly progressBarPercent: Locator;
  readonly sidebar: Locator;
  readonly sidebarItems: Locator;
  readonly lockNotice: Locator;

  // Tabs
  readonly transcriptTab: Locator;
  readonly forumTab: Locator;
  readonly notesTab: Locator;
  readonly deadlinesTab: Locator;

  // Notes Panel
  readonly highlightInput: Locator;
  readonly commentInput: Locator;
  readonly saveNoteButton: Locator;

  // Deadlines Panel
  readonly deadlinesHeading: Locator;
  readonly resetDeadlinesButton: Locator;

  // Player action
  readonly markCompleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.headerTitle = page.locator('header span.font-bold').first();
    this.progressBarPercent = page.locator('header span.font-mono');
    this.sidebar = page.locator('aside');
    this.sidebarItems = page.locator('aside button');
    this.lockNotice = page.locator('div:has-text("🔒 Bài học")');

    this.transcriptTab = page.getByRole('button', { name: /Interactive Transcript/i });
    this.forumTab = page.getByRole('button', { name: /Diễn đàn Bài học/i });
    this.notesTab = page.getByRole('button', { name: /Personal Notes/i });
    this.deadlinesTab = page.getByRole('button', { name: /Deadlines & Tiến độ/i });

    this.highlightInput = page.locator('input[placeholder*="Đoạn văn bản bôi đen"]');
    this.commentInput = page.locator('input[placeholder*="Lời nhắn/nhận xét"]');
    this.saveNoteButton = page.getByRole('button', { name: /Lưu Ghi Chú/i });

    this.deadlinesHeading = page.locator('text=/Lịch Nộp Bài Hàng Tuần/i');
    this.resetDeadlinesButton = page.getByRole('button', { name: /Reset My Deadlines/i });
    this.markCompleteButton = page.getByRole('button', { name: /Đánh dấu Hoàn thành/i });
  }

  async goto(courseId: string) {
    await this.page.goto(`/learn/${courseId}`);
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/learn\/.+/);
    await expect(this.headerTitle).toBeVisible({ timeout: 10000 });
    await expect(this.sidebar).toBeVisible();
  }

  async switchTab(tab: 'transcript' | 'forum' | 'notes' | 'deadlines') {
    if (tab === 'transcript') await this.transcriptTab.click();
    if (tab === 'forum') await this.forumTab.click();
    if (tab === 'notes') await this.notesTab.click();
    if (tab === 'deadlines') await this.deadlinesTab.click();
  }

  async createPersonalNote(highlight: string, comment: string) {
    await this.switchTab('notes');
    await this.highlightInput.fill(highlight);
    await this.commentInput.fill(comment);
    await this.saveNoteButton.click();
  }
}
