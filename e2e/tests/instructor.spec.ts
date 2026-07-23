import { test, expect } from '@playwright/test';
import { InstructorCoursesPage, CourseBuilderPage } from '../pages';

test.describe('Full System Blackbox - Instructor Flows (POM)', () => {
  test('should load instructor courses list page', async ({ page }) => {
    const instructorPage = new InstructorCoursesPage(page);
    await instructorPage.goto();
    await instructorPage.verifyPageLoaded();
  });

  test('should allow creating a new course via modal', async ({ page }) => {
    const instructorPage = new InstructorCoursesPage(page);
    await instructorPage.goto();
    await instructorPage.verifyPageLoaded();

    const uniqueTitle = `Khóa Học AI Mới ${Date.now()}`;
    const description = 'Mô tả ngắn gọn về khóa học AI tiên tiến dành cho lập trình viên.';

    await instructorPage.createNewCourse(uniqueTitle, description);

    // Verify course appears in list
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test('should load course builder page for specific course', async ({ page }) => {
    const builderPage = new CourseBuilderPage(page);
    await builderPage.goto('course-python-ai');
    await builderPage.verifyPageLoaded();

    await expect(builderPage.addWeekButton).toBeVisible();
  });

  test('should allow adding a new week module in course builder', async ({ page }) => {
    const builderPage = new CourseBuilderPage(page);
    await builderPage.goto('course-python-ai');
    await builderPage.verifyPageLoaded();

    const weekTitle = `Tuần Học Nâng Cao ${Date.now()}`;
    const summary = 'Tổng quan kiến thức và các thuật toán nâng cao trong tuần này.';

    await builderPage.createWeekModule(weekTitle, summary);

    // Verify new week module appears in syllabus tree
    await expect(page.locator(`text=${weekTitle}`)).toBeVisible({ timeout: 5000 });
  });
});
