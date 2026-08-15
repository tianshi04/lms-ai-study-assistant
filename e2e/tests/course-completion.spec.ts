import { test, expect } from '@playwright/test';
import { LearningPage, CourseCompletionModalPage } from '../pages';

test.describe('Full System Blackbox - Course Completion & CSAT Review (UAT-08 POM)', () => {
  const COURSE_ID = 'course-python-ai';

  test('should load course learning player and verify completion action elements', async ({ page }) => {
    const learningPage = new LearningPage(page);
    await learningPage.goto(COURSE_ID);
    await learningPage.verifyPageLoaded();

    // Verify player header and progress
    await expect(learningPage.headerTitle).not.toBeEmpty();
    await expect(learningPage.progressBarPercent).toBeVisible();
  });

  test('should open completion modal and allow rating & submitting CSAT review', async ({ page }) => {
    const learningPage = new LearningPage(page);
    const completionModal = new CourseCompletionModalPage(page);

    await learningPage.goto(COURSE_ID);
    await learningPage.verifyPageLoaded();

    // If "Xem Chứng Chỉ" / Completion trigger button is visible on 100% completed course
    const completionButton = page.getByRole('button', { name: /Xem Chứng Chỉ|Nhận Chứng Chỉ/i }).first();
    if (await completionButton.isVisible()) {
      await completionButton.click();

      // Verify modal is visible
      await completionModal.verifyModalVisible();

      // Submit CSAT review
      await completionModal.submitReview(5, 'Khóa học tuyệt vời, nội dung bài giảng sâu sắc và bài tập rất thực tế!');

      // Verify view certificate CTA exists in modal
      await expect(completionModal.viewCertificateButton).toBeVisible();
    }
  });
});
