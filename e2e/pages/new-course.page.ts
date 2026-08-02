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
    this.partnerSelect = page.locator('select, button:has-text("Coursera"), button:has-text("Bảo chứng"), [role="combobox"]').first();
    this.titleInput = page.locator('input[placeholder*="Ví dụ: Lập trình"], input[placeholder*="Lập trình Python"]').first();
    this.slugInput = page.locator('input[placeholder*="lap-trinh-python"]').first();
    this.descriptionTextarea = page.locator('textarea').first();
    this.subjectSelect = page.locator('select, button:has-text("Khoa học"), button:has-text("lĩnh vực")').first();
    this.levelSelect = page.locator('select, button:has-text("Sơ cấp"), button:has-text("trình độ")').first();
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
    await expect(this.titleInput).toBeVisible({ timeout: 10000 });
    await this.titleInput.click();
    await this.titleInput.fill(title);
    if (partnerOrgId) {
      const selectCount = await this.page.locator('select').count();
      if (selectCount > 0) {
        await this.page.locator('select').first().selectOption(partnerOrgId);
      } else {
        if (await this.partnerSelect.isVisible()) {
          await this.partnerSelect.click();
          const option = this.page.locator('[role="option"]').filter({ hasText: partnerOrgId }).first();
          if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
            await option.click();
          }
        }
      }
    }
    await this.descriptionTextarea.click();
    await this.descriptionTextarea.fill(description);
    await expect(this.submitButton).toBeVisible({ timeout: 10000 });
    await this.submitButton.click();
  }
}
