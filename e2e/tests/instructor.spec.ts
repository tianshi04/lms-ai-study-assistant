import { test, expect } from '@playwright/test';
import {
  InstructorCoursesPage,
  CourseBuilderPage,
  InstructorAnnouncementsPage,
  InstructorAnalyticsPage,
  NewCoursePage,
} from '../pages';

test.describe('Full System Blackbox - Instructor Flows (POM)', () => {
  test.describe.configure({ mode: 'serial' });

  test('should load instructor courses list page', async ({ page }) => {
    const instructorPage = new InstructorCoursesPage(page);
    await instructorPage.goto();
    await instructorPage.verifyPageLoaded();
  });

  test('should load new course drafting page and render partner scoping options', async ({ page }) => {
    const newCoursePage = new NewCoursePage(page);
    await newCoursePage.goto();
    await newCoursePage.verifyPageLoaded();

    await expect(newCoursePage.partnerSelect).toBeVisible();
    await expect(newCoursePage.titleInput).toBeVisible();
    await expect(newCoursePage.liveBadgePreview).toBeVisible();
  });

  test('should allow creating a new course via modal', async ({ page }) => {
    const instructorPage = new InstructorCoursesPage(page);
    await instructorPage.goto();
    await instructorPage.verifyPageLoaded();

    const uniqueTitle = `Khóa Học AI Mới ${Date.now()}`;
    const description = 'Mô tả ngắn gọn về khóa học AI tiên tiến dành cho lập trình viên.';

    await instructorPage.createNewCourse(uniqueTitle, description);

    // Verify course appears in list or builder header
    await expect(page.getByRole('heading', { name: uniqueTitle }).or(page.getByText(uniqueTitle)).first()).toBeVisible({ timeout: 25000 });
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
    await expect(page.locator(`text=${weekTitle}`)).toBeVisible({ timeout: 15000 });
  });

  test('should allow instructor to post a new course announcement', async ({ page }) => {
    const announcementsPage = new InstructorAnnouncementsPage(page);
    await announcementsPage.goto('course-python-ai');
    await announcementsPage.verifyPageLoaded();

    const annTitle = `Thông Báo Kiểm Tra Tuần ${Date.now()}`;
    const annContent = 'Nhắc nhở toàn bộ sinh viên hoàn thành bài tập trước hạn nộp.';

    await announcementsPage.postAnnouncement(annTitle, annContent);

    // Verify announcement appears on page
    await expect(page.getByText(annTitle).first()).toBeVisible({ timeout: 20000 });
  });

  test('should load instructor analytics and student roster page', async ({ page }) => {
    const analyticsPage = new InstructorAnalyticsPage(page);
    await analyticsPage.goto('course-python-ai');
    await analyticsPage.verifyPageLoaded();

    await expect(analyticsPage.totalStudentsCard).toBeVisible({ timeout: 15000 });
    await expect(analyticsPage.completionRateCard).toBeVisible({ timeout: 15000 });
  });

  test('should display drag handles and support drag & drop reordering for syllabus items', async ({ page }) => {
    const builderPage = new CourseBuilderPage(page);
    await builderPage.goto('course-python-ai');
    await builderPage.verifyPageLoaded();

    // Verify drag handle grips ⋮⋮ are visible for syllabus items
    const dragHandles = page.locator('span:has-text("⋮⋮")');
    await expect(dragHandles.first()).toBeVisible({ timeout: 5000 });
    const count = await dragHandles.count();
    expect(count).toBeGreaterThan(0);

    // Perform drag & drop reorder between items
    const firstItem = page.locator('[draggable="true"]').first();
    const secondItem = page.locator('[draggable="true"]').nth(1);

    if (await secondItem.isVisible()) {
      await firstItem.dragTo(secondItem);
    }
  });
});

