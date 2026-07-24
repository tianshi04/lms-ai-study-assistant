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
    this.searchButton = page.getByRole('button', { name: /Tra Cứu & Xác Minh/i });
    this.validBanner = page.locator('text=/Chứng chỉ Hợp lệ|Valid Verified Certificate/i');
    this.copyLinkButton = page.getByRole('button', { name: /Sao chép Link Xác minh|Đã sao chép Link/i });
    this.downloadBadgeButton = page.getByRole('button', { name: /Tải Hồ Sơ Chứng Chỉ \(JSON\)/i });
    this.qrCodeImage = page.locator('img[alt="Certificate Verification QR Code"]');
  }

  async goto(certId = 'CERT-DEMO12345') {
    await this.page.goto(`/verify/${certId}`);
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/verify/);
    await expect(this.page.locator('body')).toBeVisible();
  }

  async searchCertificate(certId: string) {
    await this.searchInput.fill(certId);
    await this.searchButton.click();
  }
}
