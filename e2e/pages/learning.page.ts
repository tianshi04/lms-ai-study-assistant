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
    this.sidebar = page.locator('aside').first();
    this.sidebarItems = page.locator('aside').first().locator('button');
    this.lockNotice = page.locator('div:has-text("mở khóa Tuần")');

    this.transcriptTab = page.getByRole('button', { name: /Interactive Transcript|Phụ đề & Transcripts|Transcripts|Phụ đề/i });
    this.forumTab = page.getByRole('button', { name: /Diễn đàn Bài học|Discussion|Thảo luận/i });
    this.notesTab = page.getByRole('button', { name: /^Xem Ghi chú Cá nhân$|^Ghi chú$|Personal Notes|My Notes/i });
    this.deadlinesTab = page.getByRole('button', { name: /Deadlines/i });



    this.highlightInput = page.getByPlaceholder(/trích dẫn|ý chính/i).or(page.locator('form input').first());
    this.commentInput = page.getByPlaceholder(/bình luận|suy nghĩ/i).or(page.locator('form input').nth(1));
    this.saveNoteButton = page.getByRole('button', { name: /Lưu ghi chú|Save Note/i }).or(page.locator('form button[type="submit"]').first());

    this.deadlinesHeading = page.locator('text=/Lịch Nộp Bài Hàng Tuần|Upcoming Course Deadlines|Các mốc Deadline/i');
    this.resetDeadlinesButton = page.getByRole('button', { name: /Reset My Deadlines/i });
    this.markCompleteButton = page.getByRole('button', { name: /Đánh dấu Hoàn thành|Mark Complete/i });
  }

  async goto(courseId: string) {
    await this.page.goto(`/learn/${courseId}`);
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/learn\/.+/);
    await expect(this.headerTitle).toBeVisible({ timeout: 15000 });
    await expect(this.sidebar).toBeVisible({ timeout: 15000 });
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
