import { test } from '@playwright/test';
import { HomePage, CourseCatalogPage } from '../pages';

test.describe('Full System Blackbox - Health Check & Home Page (POM)', () => {
  test('should load landing page successfully with title and navigation', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.verifyLoaded();
  });

  test('should navigate to courses page', async ({ page }) => {
    const homePage = new HomePage(page);
    const catalogPage = new CourseCatalogPage(page);

    await homePage.goto();
    await homePage.clickCoursesNavigation();
    await catalogPage.verifyPageLoaded();
  });
});
