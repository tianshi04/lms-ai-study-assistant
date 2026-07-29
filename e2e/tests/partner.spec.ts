import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import {
  PartnerAdminPage,
  PartnerSettingsPage,
  PartnerShowcasePage,
  InstructorProfilePage,
} from '../pages';

const AUTH_DIR = path.join(__dirname, '../.auth');
const ADMIN_AUTH = path.join(AUTH_DIR, 'admin.json');
const INSTRUCTOR_AUTH = path.join(AUTH_DIR, 'instructor.json');
const LEARNER_AUTH = path.join(AUTH_DIR, 'learner.json');

test.describe('Full System Blackbox - B2B Partner & Signatures (POM)', () => {

  // ─── Test 1: Super Admin Create Partner ───────────────────────────────────
  test.describe('Super Admin - Partner Management', () => {
    test.use({ storageState: ADMIN_AUTH });

    test('Super Admin truy cập /admin/partners, xem danh sách và tạo mới một B2B Partner kèm tên miền và chữ ký mặc định', async ({ page }) => {
      const partnerAdminPage = new PartnerAdminPage(page);
      await partnerAdminPage.goto();
      await partnerAdminPage.verifyPageLoaded();

      const timestamp = Date.now();
      const partnerData = {
        name: `Đại Học Công Nghệ ${timestamp}`,
        slug: `tech-uni-${timestamp}`,
        description: 'Đơn vị đối tác tiên phong đào tạo Công nghệ Thông tin.',
        logoUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952',
        bannerUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1',
        websiteUrl: 'https://techuni.edu.vn',
        allowedDomains: 'techuni.edu.vn, fit.techuni.edu.vn',
        signerName: 'GS.TS. Nguyễn Văn A',
        signerTitle: 'Hiệu trưởng',
        signatureImageUrl: 'https://example.com/signature.png',
      };

      await partnerAdminPage.createPartner(partnerData);

      // Verify created enterprise partner appears in list
      await expect(page.locator(`text=${partnerData.name}`).first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Test 2: Partner Admin Self-Service & Digital Keys ─────────────────────
  test.describe('Partner Admin - Partner Settings & Digital Keys', () => {
    test.use({ storageState: ADMIN_AUTH });

    test('Partner Admin truy cập /partner/settings, chỉnh sửa người ký, xoay khóa ký số và tải openbadges-issuer.json', async ({ page }) => {
      const partnerSettingsPage = new PartnerSettingsPage(page);
      await partnerSettingsPage.goto();
      await partnerSettingsPage.verifyPageLoaded();

      // Rotate Key Pair
      await partnerSettingsPage.rotateKeyPair();

      // Copy Public Key
      await partnerSettingsPage.copyPublicKey();

      // Download openbadges-issuer.json and verify contents
      const download = await partnerSettingsPage.downloadOpenBadgesJson();
      expect(download.suggestedFilename()).toBe('openbadges-issuer.json');

      const downloadPath = await download.path();
      expect(downloadPath).not.toBeNull();
      if (downloadPath) {
        const jsonContent = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'));
        expect(jsonContent.type).toBe('Issuer');
        expect(Array.isArray(jsonContent.publicKey)).toBe(true);
        expect(jsonContent.publicKey.length).toBeGreaterThan(0);
        expect(jsonContent.publicKey[0].type).toBe('CryptographicKey');
      }
    });
  });

  // ─── Test 3: Public Partner Showcase ──────────────────────────────────────
  test.describe('Learner / Public - Partner Showcase Page', () => {
    test.use({ storageState: LEARNER_AUTH });

    test('Học viên truy cập trang công khai /partners/stanford-online, xác nhận thông tin đối tác và khóa học hiển thị đúng', async ({ page }) => {
      const partnerShowcasePage = new PartnerShowcasePage(page);
      await partnerShowcasePage.goto('stanford-online');
      await partnerShowcasePage.verifyPartnerDetails('Stanford Online');

      // Verify key sections on showcase page
      await expect(page.locator('text=/Tổ chức Phát hành Chứng chỉ/i').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=/OpenBadges/i').first()).toBeVisible({ timeout: 5000 });
    });
  });

  // ─── Test 4: Instructor Academic Profile & Signature ──────────────────────
  test.describe('Instructor - Profile & Electronic Signature', () => {
    test.use({ storageState: INSTRUCTOR_AUTH });

    test('Giảng viên truy cập /instructor/profile, cập nhật chức danh khoa học & chữ ký điện tử', async ({ page }) => {
      const profilePage = new InstructorProfilePage(page);
      await profilePage.goto();
      await profilePage.verifyPageLoaded();

      const timestamp = Date.now();
      const newTitle = `PGS.TS. KHMT (${timestamp})`;
      const signatureUrl = `https://example.com/signature-${timestamp}.png`;

      await profilePage.updateProfile({
        title: newTitle,
        signatureImageUrl: signatureUrl,
      });

      // Verify preview card shows updated title
      await expect(page.locator(`text=${newTitle}`).first()).toBeVisible({ timeout: 5000 });
    });
  });
});
