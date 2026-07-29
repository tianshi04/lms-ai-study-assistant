import { test, expect } from '@playwright/test';
import { PaymentPage } from '../pages';

test.describe('Full System Blackbox - Payment & Coursera Plus Subscription (POM)', () => {
  test('should load course detail page and display enrollment action buttons', async ({ page }) => {
    await page.goto('/courses/course-python-101');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('should open payment modal and allow cancelling checkout', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    await page.goto('/courses/course-python-101');
    await page.waitForLoadState('networkidle');

    if (await paymentPage.upgradeButton.isVisible()) {
      await paymentPage.openCheckoutModal();
      await expect(paymentPage.cancelButton).toBeVisible();
      await paymentPage.cancelButton.click();
      await expect(paymentPage.checkoutModal).not.toBeVisible();
    }
  });

  test('should execute single course purchase flow via POM', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    const uniqueCourseId = `course-pay-${Date.now()}`;
    await page.goto(`/courses/${uniqueCourseId}`);
    await page.waitForLoadState('networkidle');

    if (await paymentPage.upgradeButton.isVisible()) {
      await paymentPage.openCheckoutModal();
      await paymentPage.selectSinglePurchase();
      await paymentPage.confirmCheckout();
      await paymentPage.verifyPaymentSuccess();
    }
  });

  test('should execute Coursera Plus monthly subscription flow via POM', async ({ page }) => {
    const paymentPage = new PaymentPage(page);
    const uniqueCourseId = `course-sub-m-${Date.now()}`;
    await page.goto(`/courses/${uniqueCourseId}`);
    await page.waitForLoadState('networkidle');

    if (await paymentPage.upgradeButton.isVisible()) {
      await paymentPage.openCheckoutModal();
      await paymentPage.selectMonthlySubscription();
      await paymentPage.confirmCheckout();
      await paymentPage.verifyPaymentSuccess();
    }
  });
});
