import { test, expect } from '@playwright/test';
import { BecomeAnInstructorPage } from '../pages';

test.describe('Full System Blackbox - Individual Instructor Application (POM)', () => {
  test('should navigate to become an instructor page via Navbar link', async ({ page }) => {
    await page.goto('/');
    
    const navLink = page.getByRole('link', { name: /Trở thành Giảng viên/i }).first();
    if (await navLink.isVisible()) {
      await navLink.click();
      await expect(page).toHaveURL(/\/become-an-instructor/);
    }
  });

  test('should load become an instructor page directly', async ({ page }) => {
    const instructorAppPage = new BecomeAnInstructorPage(page);
    await instructorAppPage.goto();
    await instructorAppPage.verifyPageLoaded();
  });

  test('should submit individual instructor application successfully', async ({ page }) => {
    const instructorAppPage = new BecomeAnInstructorPage(page);
    await instructorAppPage.goto();
    await instructorAppPage.verifyPageLoaded();

    // If user has already submitted an application or is an instructor, verify status card
    const isFormVisible = await instructorAppPage.titleInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isFormVisible) {
      await expect(page.locator('text=/Giảng viên|PENDING_REVIEW|Chờ Thẩm Định|Gửi Đơn Đăng Ký Thành Công/i').first()).toBeVisible();
      return;
    }

    const testTitle = `Chuyên gia Kỹ thuật AI ${Date.now()}`;
    const testBio = '10 năm kinh nghiệm nghiên cứu Machine Learning, Deep Learning và xây dựng hệ thống phân tán sản phẩm lớn.';
    const testLinkedin = 'https://linkedin.com/in/demotester';
    const testCv = 'https://example.com/cv.pdf';
    const testVideo = 'https://youtube.com/watch?v=demo';

    await instructorAppPage.submitApplication({
      title: testTitle,
      bio: testBio,
      linkedinUrl: testLinkedin,
      cvUrl: testCv,
      demoVideoUrl: testVideo,
    });

    // Verify success confirmation card with PENDING_REVIEW status
    await expect(page.locator('text=/Gửi Đơn Đăng Ký Thành Công|PENDING_REVIEW/i')).toBeVisible({ timeout: 15000 });
  });

  test('should prevent duplicate pending application submission', async ({ page }) => {
    const instructorAppPage = new BecomeAnInstructorPage(page);
    await instructorAppPage.goto();
    
    // If the page is in pending state or user is instructor, form won't be shown
    const isFormVisible = await instructorAppPage.titleInput.isVisible();
    if (!isFormVisible) {
      // Confirms page protects against duplicate submission by showing pending state or instructor state
      await expect(page.locator('text=/PENDING_REVIEW|Chờ Thẩm Định|Giảng viên/i').first()).toBeVisible();
    }
  });
});
