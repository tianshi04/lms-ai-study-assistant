import { test, expect } from '@playwright/test';
import { QuestionBankPage } from '../pages';

test.describe('Full System Blackbox - Question Bank & Exam Matrix Flows (POM)', () => {
  test.describe.configure({ mode: 'serial' });

  test('should navigate to question bank page and verify loaded state', async ({ page }) => {
    const questionBankPage = new QuestionBankPage(page);
    await questionBankPage.goto('course-python-ai');
    await questionBankPage.verifyPageLoaded();
  });

  test('should allow instructor to open modal and create a new Question Bank', async ({ page }) => {
    const questionBankPage = new QuestionBankPage(page);
    await questionBankPage.goto('course-python-ai');
    await questionBankPage.verifyPageLoaded();

    const bankTitle = `Bank E2E ${Date.now()}`;
    await questionBankPage.createQuestionBank(bankTitle, 'E2E Test Description');

    await expect(page.locator(`text=${bankTitle}`).first()).toBeVisible({ timeout: 15000 });
  });

  test('should allow instructor to add a question to selected bank', async ({ page }) => {
    const questionBankPage = new QuestionBankPage(page);
    await questionBankPage.goto('course-python-ai');
    await questionBankPage.verifyPageLoaded();

    const firstBank = questionBankPage.bankCards.first();
    if (await firstBank.isVisible()) {
      await firstBank.click();
    } else {
      await questionBankPage.createQuestionBank(`Bank E2E Auto ${Date.now()}`);
    }

    const qText = `What algorithm predicts continuous target values? (${Date.now()})`;
    await questionBankPage.addQuestionToBank(qText, 'Linear Regression', 'Logistic Regression');

    await expect(page.locator(`text=${qText}`).first()).toBeVisible({ timeout: 10000 });
  });
});
