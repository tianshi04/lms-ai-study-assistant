import { Page, Locator, expect } from '@playwright/test';

export interface CreatePartnerData {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  websiteUrl?: string;
  allowedDomains?: string;
  signerName?: string;
  signerTitle?: string;
  signatureImageUrl?: string;
  publicKeyPem?: string;
}

export class PartnerAdminPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly createPartnerButton: Locator;
  readonly modalTitle: Locator;
  readonly nameInput: Locator;
  readonly slugInput: Locator;
  readonly descriptionInput: Locator;
  readonly logoUrlInput: Locator;
  readonly bannerUrlInput: Locator;
  readonly websiteUrlInput: Locator;
  readonly allowedDomainsInput: Locator;
  readonly signerNameInput: Locator;
  readonly signerTitleInput: Locator;
  readonly signatureImageUrlInput: Locator;
  readonly publicKeyPemInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1', { hasText: 'Quản lý Đối tác Phát hành' });
    this.createPartnerButton = page.getByRole('button', { name: /Thêm đối tác mới/i });
    this.modalTitle = page.locator('h2, h3').filter({ hasText: /Thêm Đối tác Phát hành Mới|Chỉnh sửa Đối tác/i });

    this.nameInput = page.locator('input[placeholder="VD: Đại học Bách Khoa TP.HCM"]');
    this.slugInput = page.locator('input[placeholder="VD: hcmut"]');
    this.descriptionInput = page.locator('textarea[placeholder="Giới thiệu sơ lược về tổ chức đối tác..."]');
    this.logoUrlInput = page.locator('input[placeholder="https://example.com/logo.png"]');
    this.bannerUrlInput = page.locator('input[placeholder="https://example.com/banner.jpg"]');
    this.websiteUrlInput = page.locator('input[placeholder="https://hcmut.edu.vn"]');
    this.allowedDomainsInput = page.locator('input[placeholder="hcmut.edu.vn, vnuhcm.edu.vn"]');
    this.signerNameInput = page.locator('input[placeholder="GS.TS. Nguyễn Văn A"]');
    this.signerTitleInput = page.locator('input[placeholder="Hiệu trưởng"]');
    this.signatureImageUrlInput = page.locator('input[placeholder="https://example.com/signature.png"]');
    this.publicKeyPemInput = page.locator('textarea[placeholder="-----BEGIN PUBLIC KEY-----..."]');
    this.submitButton = page.locator('button[type="submit"]', { hasText: /Thêm đối tác|Cập nhật đối tác/i });
  }

  async goto() {
    await this.page.goto('/admin/partners');
  }

  async verifyPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  async openCreateModal() {
    await this.createPartnerButton.click();
    await expect(this.submitButton).toBeVisible({ timeout: 5000 });
  }

  async fillPartnerForm(data: CreatePartnerData) {
    if (data.name) await this.nameInput.fill(data.name);
    if (data.slug) await this.slugInput.fill(data.slug);
    if (data.description) await this.descriptionInput.fill(data.description);
    if (data.logoUrl) await this.logoUrlInput.fill(data.logoUrl);
    if (data.bannerUrl) await this.bannerUrlInput.fill(data.bannerUrl);
    if (data.websiteUrl) await this.websiteUrlInput.fill(data.websiteUrl);
    if (data.allowedDomains) await this.allowedDomainsInput.fill(data.allowedDomains);
    if (data.signerName) await this.signerNameInput.fill(data.signerName);
    if (data.signerTitle) await this.signerTitleInput.fill(data.signerTitle);
    if (data.signatureImageUrl) await this.signatureImageUrlInput.fill(data.signatureImageUrl);
    if (data.publicKeyPem) await this.publicKeyPemInput.fill(data.publicKeyPem);
  }

  async submitForm() {
    await this.submitButton.click();
  }

  async createPartner(data: CreatePartnerData) {
    await this.openCreateModal();
    await this.fillPartnerForm(data);
    await this.submitForm();
  }
}

export class PartnerSettingsPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly rotateKeyPairButton: Locator;
  readonly copyPublicKeyButton: Locator;
  readonly downloadOpenBadgesButton: Locator;
  readonly publicKeyTextArea: Locator;
  readonly saveSettingsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1', { hasText: 'Cấu hình Self-Service Partner Admin' });
    this.rotateKeyPairButton = page.getByRole('button', { name: /Tạo Cặp Khóa Ký số Mới|Rotate Key Pair/i });
    this.copyPublicKeyButton = page.getByRole('button', { name: /Sao chép Public Key/i });
    this.downloadOpenBadgesButton = page.getByRole('button', { name: /Tải xuống File Xác thực OpenBadges|openbadges-issuer.json/i });
    this.publicKeyTextArea = page.locator('textarea[placeholder*="Rotate Key Pair"]').or(page.locator('textarea[readonly]'));
    this.saveSettingsButton = page.locator('button[type="submit"]', { hasText: /Lưu thay đổi Cấu hình Đối tác/i });
  }

  async goto() {
    await this.page.goto('/partner/settings');
  }

  async verifyPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 10000 });
  }

  async rotateKeyPair() {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.rotateKeyPairButton.click();
    await expect(this.page.locator('text=/Đã xoay|tạo cặp khóa|thành công/i').first()).toBeVisible({ timeout: 15000 });
  }

  async copyPublicKey() {
    await this.copyPublicKeyButton.click();
    await expect(this.page.locator('text=/Đã sao chép!/i')).toBeVisible({ timeout: 5000 });
  }

  async downloadOpenBadgesJson() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.downloadOpenBadgesButton.click();
    return await downloadPromise;
  }

  async saveSettings() {
    await this.saveSettingsButton.click();
    await expect(this.page.locator('text=/Cập nhật thông tin cấu hình đối tác thành công/i')).toBeVisible({ timeout: 10000 });
  }
}

export class PartnerShowcasePage {
  readonly page: Page;
  readonly partnerNameHeading: Locator;
  readonly partnerLogo: Locator;
  readonly partnerBanner: Locator;
  readonly signerName: Locator;
  readonly signerTitle: Locator;
  readonly signatureImage: Locator;
  readonly coursesList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.partnerNameHeading = page.locator('h1').first();
    this.partnerLogo = page.locator('img[alt*="Logo"], img[alt*="Partner"]').first();
    this.partnerBanner = page.locator('img[alt*="Banner"]').first();
    this.signerName = page.locator('p.font-bold.text-slate-900, p.font-bold.text-white').first();
    this.signerTitle = page.locator('p.text-xs.text-slate-500').first();
    this.signatureImage = page.locator('img[alt*="Chữ ký"]').first();
    this.coursesList = page.locator('h2:has-text("Các khóa học do")');
  }

  async goto(slug: string) {
    await this.page.goto(`/partners/${slug}`);
  }

  async verifyPartnerDetails(expectedName: string) {
    await expect(this.page.locator(`h1:has-text("${expectedName}")`)).toBeVisible({ timeout: 10000 });
  }
}
