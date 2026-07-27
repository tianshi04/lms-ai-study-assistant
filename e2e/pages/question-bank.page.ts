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
    this.bankTitleInput = page.locator('input[placeholder*="Kho Ngân hàng"], form input[type="text"]').first();
    this.bankCategorySelect = page.locator('form select').first();
    this.bankDescriptionInput = page.locator('form textarea').first();
    this.submitBankButton = page.getByRole('button', { name: /Xác nhận tạo Kho|Confirm Create/i });

    this.addQuestionButton = page.getByRole('button', { name: /Thêm Câu hỏi vào Kho|Add Question/i });
    this.questionTextInput = page.locator('textarea[placeholder*="nội dung câu hỏi"], form textarea').first();
    this.questionTypeSelect = page.locator('form select').first();
    this.questionDifficultySelect = page.locator('form select').nth(1);
    this.optionTextInputs = page.locator('input[placeholder*="tùy chọn"], input[placeholder*="option"]');
    this.submitQuestionButton = page.getByRole('button', { name: /Lưu câu hỏi|Save Question/i });

    this.bankCards = page.locator('button:has-text("câu hỏi")');
    this.questionCards = page.locator('div.p-5.rounded-2xl');
  }

  async goto(courseId: string = 'course-1') {
    await this.page.goto(`/instructor/courses/${courseId}/question-bank`);
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/instructor\/courses\/.*\/question-bank/);
    await expect(this.page.locator('body')).toBeVisible();
  }

  async createQuestionBank(title: string, description: string = 'Test Bank Description') {
    await this.addQuestionBankButton.click();
    await expect(this.bankTitleInput).toBeVisible({ timeout: 5000 });
    await this.bankTitleInput.fill(title);
    if (await this.bankDescriptionInput.isVisible()) {
      await this.bankDescriptionInput.fill(description);
    }
    await this.submitBankButton.click();
  }

  async addQuestionToBank(questionText: string, option1: string, option2: string) {
    await this.addQuestionButton.click();
    await expect(this.questionTextInput).toBeVisible({ timeout: 5000 });
    await this.questionTextInput.fill(questionText);

    const inputs = await this.optionTextInputs.all();
    if (inputs.length >= 2) {
      await inputs[0].fill(option1);
      await inputs[1].fill(option2);
    }

    const checkButtons = this.page.locator('button:has-text("✓"), button[title*="đáp án"]');
    if ((await checkButtons.count()) > 0) {
      await checkButtons.first().click();
    }

    await this.submitQuestionButton.click();
  }
}
