import { test, expect } from '@playwright/test';
import { CourseCatalogPage, CourseDetailPage } from '../pages';

test.describe('Full System Blackbox - Course Catalog & Discovery (POM)', () => {
  test('should load course catalog with search bar and course cards', async ({ page }) => {
    const catalogPage = new CourseCatalogPage(page);
    await catalogPage.goto();
    await catalogPage.verifyPageLoaded();

    const cardCount = await catalogPage.getCourseCardsCount();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('should filter courses in real-time when searching', async ({ page }) => {
    const catalogPage = new CourseCatalogPage(page);
    await catalogPage.goto();
    await catalogPage.verifyPageLoaded();

    const initialCount = await catalogPage.getCourseCardsCount();
    expect(initialCount).toBeGreaterThan(0);

    await catalogPage.search('Python');
    await page.waitForTimeout(300);

    const filteredCount = await catalogPage.getCourseCardsCount();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('should display empty state when searching for nonexistent term', async ({ page }) => {
    const catalogPage = new CourseCatalogPage(page);
    await catalogPage.goto();
    await catalogPage.verifyPageLoaded();

    await catalogPage.search('NonExistentCourseXYZ123');
    await page.waitForTimeout(300);

    await expect(catalogPage.emptyStateMessage).toBeVisible();
    const count = await catalogPage.getCourseCardsCount();
    expect(count).toBe(0);
  });

  test('should navigate to course detail page when clicking a course card', async ({ page }) => {
    const catalogPage = new CourseCatalogPage(page);
    const detailPage = new CourseDetailPage(page);

    await catalogPage.goto();
    await catalogPage.verifyPageLoaded();

    await catalogPage.clickFirstCourse();
    await detailPage.verifyPageLoaded();
  });

  test('should display course details and syllabus structure', async ({ page }) => {
    const detailPage = new CourseDetailPage(page);
    await detailPage.goto('course-python-ai');
    await detailPage.verifyPageLoaded();

    await expect(detailPage.courseTitle).not.toBeEmpty();
    await expect(detailPage.syllabusHeading).toBeVisible();
  });

  test('should navigate to learning page when clicking enroll button', async ({ page }) => {
    const detailPage = new CourseDetailPage(page);
    await detailPage.goto('course-python-ai');
    await detailPage.verifyPageLoaded();

    await detailPage.clickEnroll();

    await expect(page).toHaveURL(/\/learn\/course-python-ai/, { timeout: 10000 });
  });
});
