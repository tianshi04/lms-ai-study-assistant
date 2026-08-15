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
    this.partnerSelect = page.locator('#orgSelect, [aria-label*="Partner"], button[role="combobox"], button:has-text("Coursera")').first();
    this.titleInput = page.locator('#courseTitle').or(page.getByLabel(/Tên Khóa Học/i)).or(page.locator('input[name="title"]')).or(page.getByPlaceholder(/Lập trình|Ví dụ/i)).first();
    this.slugInput = page.locator('#courseSlug, input[placeholder*="lap-trinh-python"]').first();
    this.descriptionTextarea = page.locator('textarea').first();
    this.subjectSelect = page.locator('select, button:has-text("Khoa học"), button:has-text("lĩnh vực")').first();
    this.levelSelect = page.locator('select, button:has-text("Sơ cấp"), button:has-text("trình độ")').first();
    this.financialAidCheckbox = page.locator('input[type="checkbox"]').first();
    this.submitButton = page.getByRole('button', { name: /Bắt Đầu Tạo Khóa Học|Tạo Khóa Học/i });
    this.cancelButton = page.getByRole('link', { name: /Hủy bỏ/i });
    this.liveBadgePreview = page.getByText('Live Badge Preview').first();
  }

  async goto() {
    await this.page.goto('/instructor/courses/new', { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/instructor\/courses\/new/);
    await expect(this.titleInput).toBeVisible({ timeout: 20000 });
    await expect(this.submitButton).toBeVisible({ timeout: 20000 });
    await expect(this.partnerSelect).toBeVisible({ timeout: 20000 });
  }

  async fillAndSubmitCourse(title: string, description: string, partnerOrgId?: string) {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.titleInput).toBeVisible({ timeout: 10000 });
    await expect(this.titleInput).toBeEnabled({ timeout: 5000 });
    await this.titleInput.click();
    await this.titleInput.fill(title);
    await expect(this.titleInput).toHaveValue(title, { timeout: 5000 });

    // Verify or ensure slug is populated
    await expect(this.slugInput).toBeVisible({ timeout: 5000 });
    const currentSlug = await this.slugInput.inputValue();
    if (!currentSlug) {
      const generatedSlug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      await this.slugInput.fill(generatedSlug);
    }

    if (partnerOrgId) {
      const selectCount = await this.page.locator('select').count();
      if (selectCount > 0) {
        await this.page.locator('select').first().selectOption(partnerOrgId).catch(() => null);
      } else {
        const orgTrigger = this.page.locator('button').filter({ hasText: /đối tác|tổ chức|partner/i }).first();
        if (await orgTrigger.isVisible()) {
          await orgTrigger.click();
          const option = this.page.locator('[role="option"]').filter({ hasText: partnerOrgId }).first();
          if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
            await option.click();
          }
        }
      }
    }

    await this.descriptionTextarea.click();
    await this.descriptionTextarea.fill(description);
    await expect(this.descriptionTextarea).toHaveValue(description, { timeout: 5000 });

    // Ensure title and slug remain filled before submission
    if ((await this.titleInput.inputValue()) !== title) {
      await this.titleInput.fill(title);
    }
    await expect(this.titleInput).toHaveValue(title, { timeout: 5000 });
    await expect(this.slugInput).not.toHaveValue('', { timeout: 5000 });

    await expect(this.submitButton).toBeVisible({ timeout: 10000 });
    await expect(this.submitButton).toBeEnabled({ timeout: 5000 });
    await this.submitButton.click({ force: true });
    await expect(this.page).toHaveURL(/\/instructor\/courses\/.+/, { timeout: 25000 });
  }
}
