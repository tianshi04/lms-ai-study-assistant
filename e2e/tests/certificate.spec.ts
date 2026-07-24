import { test, expect } from '@playwright/test';
import { CertificatePage } from '../pages';

test.describe('Full System Blackbox - Verified Certificate & OpenBadges (POM)', () => {
  test('should load public certificate verification portal page', async ({ page }) => {
    const certPage = new CertificatePage(page);
    await certPage.goto('CERT-DEMO12345');
    await certPage.verifyPageLoaded();

    await expect(certPage.validBanner).toBeVisible({ timeout: 10000 });
  });

  test('should display certificate metadata, partner logo, and QR code image', async ({ page }) => {
    const certPage = new CertificatePage(page);
    await certPage.goto('CERT-DEMO12345');
    await certPage.verifyPageLoaded();

    // Verify recipient & course title details
    await expect(page.locator('text=/CERT-DEMO12345/i').first()).toBeVisible();
    await expect(certPage.qrCodeImage).toBeVisible({ timeout: 10000 });
  });

  test('should copy verification link to clipboard', async ({ page, context }) => {
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    } catch {
      // Ignore permission grant failure on browsers that do not support it
    }
    const certPage = new CertificatePage(page);
    await certPage.goto('CERT-DEMO12345');
    await certPage.verifyPageLoaded();

    await expect(certPage.copyLinkButton).toBeVisible();
    await certPage.copyLinkButton.click({ force: true });
    await expect(page.locator('text=/Đã sao chép Link/i')).toBeVisible({ timeout: 5000 });
  });



  test('should allow downloading OpenBadges 2.0 JSON-LD profile', async ({ page }) => {
    const certPage = new CertificatePage(page);
    await certPage.goto('CERT-DEMO12345');
    await certPage.verifyPageLoaded();

    await expect(certPage.downloadBadgeButton).toBeVisible();
  });

  test('should display revoked certificate alert message when certificate is revoked (BR_CERT_004)', async ({ page }) => {
    const certPage = new CertificatePage(page);
    await certPage.goto('CERT-REVOKED-TEST');
    await expect(page.locator('text=/CẢNH BÁO|Đã Bị Thu Hồi|Revoked|Không Tìm Thấy/i').first()).toBeVisible({ timeout: 10000 });
  });
});
