import { Page, Locator, expect } from '@playwright/test';

export class AdminCourseReviewPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly pendingTab: Locator;
  readonly publishedTab: Locator;
  readonly draftTab: Locator;
  readonly rejectedTab: Locator;
  readonly courseCards: Locator;
  readonly rejectModal: Locator;
  readonly rejectReasonInput: Locator;
  readonly confirmRejectButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1', { hasText: /Kiểm duyệt & Phê duyệt Phát hành Khóa học/i });
    this.pendingTab = page.getByRole('tab', { name: /Chờ kiểm duyệt/i });
    this.publishedTab = page.getByRole('tab', { name: /Đã xuất bản/i });
    this.draftTab = page.getByRole('tab', { name: /Bản nháp/i });
    this.rejectedTab = page.getByRole('tab', { name: /Từ chối/i });
    this.courseCards = page.locator('main .space-y-4 > div');
    this.rejectModal = page.locator('h2, h3').filter({ hasText: /Từ chối Phê duyệt Khóa học/i });
    this.rejectReasonInput = page.locator('textarea[placeholder*="Ví dụ: Bài giảng tuần 2 thiếu phụ đề"]');
    this.confirmRejectButton = page.getByRole('button', { name: /Xác nhận Từ chối/i });
  }

  async goto() {
    await this.page.goto('/admin/courses/review');
  }

  async verifyPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  async filterByTab(status: 'pending' | 'published' | 'draft' | 'rejected') {
    if (status === 'pending') await this.pendingTab.click();
    else if (status === 'published') await this.publishedTab.click();
    else if (status === 'draft') await this.draftTab.click();
    else if (status === 'rejected') await this.rejectedTab.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
}

export class AdminCategoriesPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly nameInput: Locator;
  readonly typeSelect: Locator;
  readonly createButton: Locator;
  readonly subjectsList: Locator;
  readonly levelsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /Danh mục quản trị/i });
    this.nameInput = page.locator('input[placeholder="Nhập tên danh mục"]');
    this.typeSelect = page.locator('[role="combobox"]').first();
    this.createButton = page.getByRole('button', { name: /Thêm danh mục/i });
    this.subjectsList = page.locator('h3', { hasText: /Danh sách chủ đề/i });
    this.levelsList = page.locator('h3', { hasText: /Danh sách cấp độ/i });
  }

  async goto() {
    await this.page.goto('/admin/categories');
  }

  async verifyPageLoaded() {
    await expect(this.subjectsList).toBeVisible({ timeout: 10000 });
  }

  async createCategory(name: string) {
    await this.nameInput.fill(name);
    await this.createButton.click();
  }
}
