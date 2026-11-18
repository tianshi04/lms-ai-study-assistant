import { test, expect } from '@playwright/test';
import { ForumPage, LearningPage } from '../pages';

test.describe('Full System Blackbox - Discussion Forum Flows (POM)', () => {
  test.describe.configure({ mode: 'serial' });

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
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 15000 });
  });

  test('should allow replying to an existing thread', async ({ page }) => {
    const forumPage = new ForumPage(page);
    await forumPage.goto();
    await forumPage.verifyPageLoaded();

    // Ensure a thread exists first
    const uniqueTitle = `Thread for Reply Test ${Date.now()}`;
    await forumPage.createNewThread(uniqueTitle, 'Testing reply functionality.');
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 15000 });

    const replyMessage = `Trả lời tự động E2E ${Date.now()}`;
    await forumPage.postFirstReply(replyMessage);

    await expect(page.locator(`text=${replyMessage}`)).toBeVisible({ timeout: 15000 });
  });

  test('should allow upvoting a reply and enforcing 1 vote per user (BR_FORUM_001)', async ({ page }) => {
    const forumPage = new ForumPage(page);
    await forumPage.goto();
    await forumPage.verifyPageLoaded();

    await forumPage.upvoteReply();
  });

  test('should display forum tab inside learning player and allow creating questions', async ({ page }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto('course-python-ai');
    await learningPage.verifyPageLoaded();

    await learningPage.switchTab('forum');
    await expect(learningPage.forumTab).toBeVisible();

    const playerQuestion = `Player Forum Question ${Date.now()}`;
    const questionInput = page.locator('input[placeholder*="Đặt câu hỏi thảo luận"]');
    await expect(questionInput).toBeVisible();
    await questionInput.fill(playerQuestion);

    const submitBtn = page.getByRole('button', { name: /Đăng Thảo Luận/i });
    await submitBtn.click();

    await expect(page.locator(`text=${playerQuestion}`)).toBeVisible({ timeout: 15000 });

    const playerSearchInput = page.locator('input[name="forumSearch"]');
    await expect(playerSearchInput).toBeVisible({ timeout: 10000 });
    await playerSearchInput.fill(playerQuestion);
    await expect(page.locator(`text=${playerQuestion}`)).toBeVisible({ timeout: 15000 });
  });

  test('should support Vietnamese accent-insensitive search and Solved/Unsolved filter (BR_FORUM_004, BR_FORUM_005)', async ({ page }) => {
    const forumPage = new ForumPage(page);
    await forumPage.goto();
    await forumPage.verifyPageLoaded();

    const uniqueSuffix = Date.now();
    const vietnameseTitle = `Thắc mắc tối ưu Gradient ${uniqueSuffix}`;
    await forumPage.createNewThread(vietnameseTitle, 'Hướng dẫn điều chỉnh learning rate tại Đà Nẵng.');
    await expect(page.locator(`text=${vietnameseTitle}`)).toBeVisible({ timeout: 15000 });

    // Accent-insensitive Vietnamese search matches newly created thread
    await forumPage.searchThreads(`thac mac toi uu ${uniqueSuffix}`);
    await expect(page.locator(`text=${vietnameseTitle}`)).toBeVisible({ timeout: 15000 });

    // Non-matching search shows empty-filter reset UI
    await forumPage.searchThreads(`khongtonai_${uniqueSuffix}_xyz`);
    await expect(page.locator('text=Không tìm thấy chủ đề phù hợp.')).toBeVisible({ timeout: 15000 });
    await forumPage.clearSearch();
    await expect(page.locator(`text=${vietnameseTitle}`)).toBeVisible({ timeout: 15000 });

    // Unsolved filter keeps newly created thread; Solved filter hides it and shows Solved Badge cards
    await forumPage.filterByResolution('unsolved');
    await expect(page.locator(`text=${vietnameseTitle}`)).toBeVisible({ timeout: 15000 });

    await forumPage.filterByResolution('solved');
    await expect(page.locator(`text=${vietnameseTitle}`)).toBeHidden({ timeout: 15000 });
    const solvedCardBadge = page.locator('[id^="thread-"]').filter({ hasText: 'Đã giải quyết' }).first();
    await expect(solvedCardBadge).toBeVisible({ timeout: 15000 });
  });
});

