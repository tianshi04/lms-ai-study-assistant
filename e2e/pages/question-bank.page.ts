import { Page, Locator, expect } from '@playwright/test';

export class QuestionBankPage {
  readonly page: Page;
  readonly addQuestionBankButton: Locator;
  readonly bankTitleInput: Locator;
  readonly bankCategorySelect: Locator;
  readonly bankDescriptionInput: Locator;
  readonly submitBankButton: Locator;

  readonly addQuestionButton: Locator;
  readonly questionTextInput: Locator;
  readonly questionTypeSelect: Locator;
  readonly questionDifficultySelect: Locator;
  readonly optionTextInputs: Locator;
  readonly submitQuestionButton: Locator;

  readonly bankCards: Locator;
  readonly questionCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addQuestionBankButton = page.getByRole('button', { name: /Tạo Kho Ngân hàng Đề|Create Question Bank/i });
    this.bankTitleInput = page.locator('div.z-modal input, input[placeholder*="Kho thi"], input[aria-label*="Tên Kho"]').first();
    this.bankCategorySelect = page.locator('form select').first();
    this.bankDescriptionInput = page.locator('form textarea').first();
    this.submitBankButton = page.getByRole('button', { name: /Xác nhận tạo Kho|Confirm Create/i });

    this.addQuestionButton = page.getByRole('button', { name: /Thêm Câu hỏi vào Kho|Add Question/i });
    this.questionTextInput = page.locator('textarea[placeholder*="nội dung câu hỏi"], form textarea').first();
    this.questionTypeSelect = page.locator('form select').first();
    this.questionDifficultySelect = page.locator('form select').nth(1);
    this.optionTextInputs = page.locator('input[placeholder*="Phương án"], input[placeholder*="tùy chọn"], input[aria-label*="phương án"]');
    this.submitQuestionButton = page.getByRole('button', { name: /Lưu câu hỏi|Lưu thay đổi|Save Question/i });

    this.bankCards = page.locator('button:has-text("câu hỏi")');
    this.questionCards = page.locator('div.p-5.rounded-2xl');
  }

  async goto(courseId: string = 'course-python-ai') {
    await this.page.goto(`/instructor/courses/${courseId}/question-bank`, { waitUntil: 'networkidle' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/instructor\/courses\/.*\/question-bank/);
    await expect(this.page.locator('body')).toBeVisible();
  }

  async createQuestionBank(title: string, description: string = 'Test Bank Description') {
    await expect(this.addQuestionBankButton).toBeVisible({ timeout: 10000 });
    await expect(this.addQuestionBankButton).toBeEnabled({ timeout: 5000 });

    for (let i = 0; i < 3; i++) {
      await this.addQuestionBankButton.click();
      await this.page.waitForTimeout(400);
      if (await this.bankTitleInput.isVisible()) break;
    }

    await expect(this.bankTitleInput).toBeVisible({ timeout: 15000 });
    await this.bankTitleInput.fill(title);
    if (await this.bankDescriptionInput.isVisible()) {
      await this.bankDescriptionInput.fill(description);
    }
    await this.submitBankButton.click();
    await expect(this.bankTitleInput).toBeHidden({ timeout: 10000 });
  }

  async addQuestionToBank(questionText: string, option1: string, option2: string) {
    await expect(this.addQuestionButton).toBeVisible({ timeout: 10000 });
    await this.addQuestionButton.click();
    await expect(this.questionTextInput).toBeVisible({ timeout: 5000 });
    await this.questionTextInput.fill(questionText);

    await expect(this.optionTextInputs.first()).toBeVisible({ timeout: 5000 });
    const count = await this.optionTextInputs.count();
    if (count >= 2) {
      await this.optionTextInputs.nth(0).fill(option1);
      await this.optionTextInputs.nth(1).fill(option2);
    }

    const radio = this.page.locator('[role="radio"], button[title*="phương án"], button[title*="đáp án"]').first();
    await expect(radio).toBeVisible({ timeout: 5000 });
    await radio.click();

    await this.submitQuestionButton.click();
    await expect(this.questionTextInput).toBeHidden({ timeout: 10000 });
  }
}
