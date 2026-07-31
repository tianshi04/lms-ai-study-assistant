import { test, expect } from '@playwright/test';
import { TAGradingPage } from '../pages';

// ─── Shared: Redirect /dashboard → / ──────────────────────────────────────────
// Runs in every project (works regardless of role since redirect happens server-side)
test.describe('Dashboard Redirect', () => {
  test('should redirect /dashboard to root /', async ({ page }) => {
    await page.goto('/dashboard');
    // toHaveURL matches full URL — check pathname ends at root
    const url = new URL(page.url());
    expect(url.pathname).toBe('/');
  });
});

// ─── Learner Dashboard (chromium-learner project) ─────────────────────────────
test.describe('Learner Dashboard @ /', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!testInfo.project.name.includes('learner')) {
      test.skip();
    }
  });

  test('learner: / should render the learning dashboard', async ({ page }) => {
    await page.goto('/');
    // Learner dashboard must NOT show other role-specific KPI headers
    await expect(page.locator('text=BẢNG ĐIỀU KHIỂN GIẢNG VIÊN')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=BẢNG ĐIỀU KHIỂN TRỢ GIẢNG (TA)')).not.toBeVisible();
    // Page loads successfully (no error boundary)
    await expect(page).not.toHaveTitle(/Error|500/);
  });
});

// ─── Instructor Dashboard (chromium-instructor project) ───────────────────────
test.describe('Instructor Dashboard', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!testInfo.project.name.includes('instructor')) {
      test.skip();
    }
  });

  test('instructor: / should render the instructor dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=BẢNG ĐIỀU KHIỂN GIẢNG VIÊN')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=TỔNG HỌC VIÊN')).toBeVisible();
    await expect(page.locator('text=ĐÃ XUẤT BẢN')).toBeVisible();
  });

  test('instructor: /instructor/dashboard should render the instructor dashboard', async ({ page }) => {
    await page.goto('/instructor/dashboard');
    await expect(page.locator('text=BẢNG ĐIỀU KHIỂN GIẢNG VIÊN')).toBeVisible({ timeout: 15000 });
  });

  test('instructor: quick action - create course link should be visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=TẠO KHÓA HỌC MỚI').first()).toBeVisible({ timeout: 15000 });
  });
});

// ─── TA Grading Queue (chromium-instructor project has TA auth too in this setup)
// TAGradingPage tests are run under chromium-instructor since there is no chromium-ta project
test.describe('TA Grading Queue', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!testInfo.project.name.includes('instructor')) {
      test.skip();
    }
  });

  test('ta: /ta/grading should render the grading queue page', async ({ page }) => {
    const taGradingPage = new TAGradingPage(page);
    await taGradingPage.goto();
    await taGradingPage.verifyPageLoaded();
  });

  test('ta: grading queue should show filter tabs', async ({ page }) => {
    const taGradingPage = new TAGradingPage(page);
    await taGradingPage.goto();
    await taGradingPage.verifyPageLoaded();

    await expect(taGradingPage.pendingTab).toBeVisible();
    await expect(taGradingPage.appealedTab).toBeVisible();
    await expect(taGradingPage.gradedTab).toBeVisible();
  });

  test('ta: clicking grade button should open evaluation modal', async ({ page }) => {
    const taGradingPage = new TAGradingPage(page);
    await taGradingPage.goto();
    await taGradingPage.verifyPageLoaded();

    await taGradingPage.openFirstSubmissionGradeModal();
    await expect(taGradingPage.scoreInput).toBeVisible();
  });
});

// ─── Admin Dashboard (chromium-admin project) ─────────────────────────────────
test.describe('Admin Dashboard @ /', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (!testInfo.project.name.includes('admin')) {
      test.skip();
    }
  });

  test('admin: / should render the admin dashboard with quick-ops navigation', async ({ page }) => {
    await page.goto('/');
    // Admin dashboard embeds quick-ops nav links
    await expect(page.locator('text=Duyệt Đơn Giảng Viên')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Duyệt Khóa Học')).toBeVisible();
    await expect(page.locator('text=Quản Lý Danh Mục')).toBeVisible();
    await expect(page.locator('text=Quản Trị Đối Tác')).toBeVisible();
  });

  test('admin: quick-ops links should navigate to correct routes', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/admin/applications"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('a[href="/admin/courses/review"]')).toBeVisible();
    await expect(page.locator('a[href="/admin/categories"]')).toBeVisible();
  });
});
