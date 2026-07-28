import { Page, Locator, expect } from '@playwright/test';

export class VerifyPortalPage {
  readonly page: Page;
  readonly certIdInput: Locator;
  readonly verifyButton: Locator;
  readonly sampleCertLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.certIdInput = page.locator('input[placeholder*="CERT"]');
    this.verifyButton = page.getByRole('button', { name: /Xác Minh Ngay|Tra Cứu & Xác Minh|Verify Now|Verify|Tra cứu Chứng chỉ/i });
    this.sampleCertLink = page.getByRole('button', { name: /CERT-DEMO12345/i });
  }

  async goto() {
    await this.page.goto('/verify');
  }

  async verifyPageLoaded() {
    await expect(this.page).toHaveURL(/\/verify/);
    await expect(this.certIdInput).toBeVisible();
    await expect(this.verifyButton).toBeVisible();
  }

  async searchCert(certId: string) {
    await this.certIdInput.fill(certId);
    await this.verifyButton.click();
  }
}
