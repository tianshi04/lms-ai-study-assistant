import { test, expect } from '@playwright/test';
import { ForumPage, LearningPage } from '../pages';

test.describe('Full System Blackbox - Discussion Forum Flows (POM)', () => {
  test('should load standalone forum page', async ({ page }) => {
    const forumPage = new ForumPage(page);
    await forumPage.goto();
    await forumPage.verifyPageLoaded();
  });

  test('should allow creating a new discussion thread', async ({ page }) => {
    const forumPage = new ForumPage(page);
    await forumPage.goto();
    await forumPage.verifyPageLoaded();

    const uniqueTitle = `Thắc mắc E2E Test ${Date.now()}`;
    const content = 'Nội dung câu hỏi chi tiết từ automated test case.';

    await forumPage.createNewThread(uniqueTitle, content);

    // Verify new thread is displayed on page
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test('should allow replying to an existing thread', async ({ page }) => {
    const forumPage = new ForumPage(page);
    await forumPage.goto();
    await forumPage.verifyPageLoaded();

    // Ensure a thread exists first
    const uniqueTitle = `Thread for Reply Test ${Date.now()}`;
    await forumPage.createNewThread(uniqueTitle, 'Testing reply functionality.');
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 5000 });

    const replyMessage = `Trả lời tự động E2E ${Date.now()}`;
    await forumPage.postFirstReply(replyMessage);

    await expect(page.locator(`text=${replyMessage}`)).toBeVisible({ timeout: 5000 });
  });

  test('should display forum tab inside learning player and allow creating questions', async ({ page }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto('course-python-ai');
    await learningPage.verifyPageLoaded();

    await learningPage.switchTab('forum');
    await expect(learningPage.forumTab).toHaveClass(/border-blue-500/);

    const playerQuestion = `Player Forum Question ${Date.now()}`;
    const questionInput = page.locator('input[placeholder*="Đặt câu hỏi thảo luận"]');
    await expect(questionInput).toBeVisible();
    await questionInput.fill(playerQuestion);

    const submitBtn = page.getByRole('button', { name: /Đăng Thảo Luận/i });
    await submitBtn.click();

    await expect(page.locator(`text=${playerQuestion}`)).toBeVisible({ timeout: 5000 });
  });
});
