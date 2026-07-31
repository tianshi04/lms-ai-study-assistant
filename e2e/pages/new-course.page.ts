import { Page, Locator, expect } from '@playwright/test';

export class NewCoursePage {
  readonly page: Page;
  readonly partnerSelect: Locator;
  readonly titleInput: Locator;
  readonly slugInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly subjectSelect: Locator;
  readonly levelSelect: Locator;
  readonly financialAidCheckbox: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly liveBadgePreview: Locator;

  constructor(page: Page) {
    this.page = page;
    this.partnerSelect = page.locator('select').first();
    this.titleInput = page.locator('input[placeholder*="Lập trình Python"]').first();
    this.slugInput = page.locator('input[placeholder*="lap-trinh-python"]').first();
    this.descriptionTextarea = page.locator('textarea').first();
    this.subjectSelect = page.locator('select').nth(1);
    this.levelSelect = page.locator('select').nth(2);
    this.financialAidCheckbox = page.locator('input[type="checkbox"]').first();
    this.submitButton = page.getByRole('button', { name: /Bắt Đầu Tạo Khóa Học|Tạo Khóa Học/i });
    this.cancelButton = page.getByRole('link', { name: /Hủy bỏ/i });
    this.liveBadgePreview = page.getByText('Live Badge Preview').first();
  }

  async goto() {
    await this.page.goto('/instructor/courses/new');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/instructor\/courses\/new/);
    await expect(this.titleInput).toBeVisible({ timeout: 15000 });
  }

  async fillAndSubmitCourse(title: string, description: string, partnerOrgId?: string) {
    await this.titleInput.fill(title);
    if (partnerOrgId) {
      await this.partnerSelect.selectOption(partnerOrgId);
    }
    await this.descriptionTextarea.fill(description);
    await this.submitButton.click();
  }
}
