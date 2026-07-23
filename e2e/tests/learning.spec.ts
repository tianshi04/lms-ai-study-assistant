import { test, expect } from '@playwright/test';
import { LearningPage } from '../pages';

test.describe('Full System Blackbox - Learning Experience (POM)', () => {
  const COURSE_ID = 'course-python-ai';

  test('should load learning player page with course title, progress bar and sidebar', async ({ page }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto(COURSE_ID);
    await learningPage.verifyPageLoaded();

    await expect(learningPage.headerTitle).not.toBeEmpty();
    await expect(learningPage.progressBarPercent).toBeVisible();

    const itemsCount = await learningPage.sidebarItems.count();
    expect(itemsCount).toBeGreaterThan(0);
  });

  test('should allow switching between player tabs (Transcript, Forum, Notes, Deadlines)', async ({ page }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto(COURSE_ID);
    await learningPage.verifyPageLoaded();

    // Switch to Forum tab
    await learningPage.switchTab('forum');
    await expect(learningPage.forumTab).toHaveClass(/border-blue-500/);

    // Switch to Notes tab
    await learningPage.switchTab('notes');
    await expect(learningPage.notesTab).toHaveClass(/border-blue-500/);
    await expect(learningPage.highlightInput).toBeVisible();

    // Switch to Deadlines tab
    await learningPage.switchTab('deadlines');
    await expect(learningPage.deadlinesTab).toHaveClass(/border-blue-500/);
    await expect(learningPage.deadlinesHeading).toBeVisible();

    // Switch back to Transcript tab
    await learningPage.switchTab('transcript');
    await expect(learningPage.transcriptTab).toHaveClass(/border-blue-500/);
  });

  test('should create a new personal note successfully', async ({ page }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto(COURSE_ID);
    await learningPage.verifyPageLoaded();

    const uniqueText = `Highlighted text sample ${Date.now()}`;
    const commentText = 'Ghi chú học tập tự động từ E2E test';

    await learningPage.createPersonalNote(uniqueText, commentText);

    // Check that the note appears in the notes list
    await expect(page.locator(`text=${uniqueText}`)).toBeVisible({ timeout: 5000 });
  });

  test('should display deadlines schedule and handle reset deadlines if overdue', async ({ page }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto(COURSE_ID);
    await learningPage.verifyPageLoaded();

    await learningPage.switchTab('deadlines');
    await expect(learningPage.deadlinesHeading).toBeVisible();

    // Reset button only displays if any weekly deadline is overdue
    if (await learningPage.resetDeadlinesButton.isVisible()) {
      await learningPage.resetDeadlinesButton.click();
      await expect(learningPage.deadlinesHeading).toBeVisible();
    }
  });

  test('should redirect unauthenticated users to login page', async ({ browser }) => {
    // Create clean context with no auth tokens
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const cleanPage = await context.newPage();

    await cleanPage.goto(`/learn/${COURSE_ID}`);

    // Should redirect to /auth/login?redirect=/learn/course-python-ai
    await expect(cleanPage).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    await context.close();
  });
});
