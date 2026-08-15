import { Page, Locator, expect } from '@playwright/test';

export class CertificatePage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly validBanner: Locator;
  readonly copyLinkButton: Locator;
  readonly downloadBadgeButton: Locator;
  readonly qrCodeImage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('input[placeholder*="CERT-"]');
    this.searchButton = page.getByRole('button', { name: /Tra Cứu & Xác Minh|Verify Certificate|Search/i });
    this.validBanner = page.locator('text=/Chứng chỉ Hợp lệ|Chứng chỉ Xác minh Chính thức|Valid Verified Certificate|Official Verified Certificate/i').first();
    this.copyLinkButton = page.getByRole('button', { name: /Copy Verification Link|Sao chép|Copy/i }).first();
    this.downloadBadgeButton = page.getByRole('button', { name: /Tải Hồ Sơ|Download/i });
    this.qrCodeImage = page.locator('img[alt="Certificate Verification QR Code"]');
  }

  async goto(certId = 'CERT-DEMO12345') {
    await this.page.goto(`/verify/${certId}`, { waitUntil: 'domcontentloaded' });
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/verify/);
    await expect(this.validBanner).toBeVisible({ timeout: 15000 });
  }

  async searchCertificate(certId: string) {
    await this.searchInput.fill(certId);
    await this.searchButton.click();
  }
}
