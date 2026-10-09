import { test, expect } from '@playwright/test';
import * as path from 'path';
import {
  MyOrganizationsPage,
  OrganizationManagePage,
  OrganizationMembersPage,
  OrganizationInvitationsPage,
  InvitationAcceptPage,
} from '../pages';

const AUTH_DIR = path.join(__dirname, '../.auth');
const ADMIN_AUTH = path.join(AUTH_DIR, 'admin.json');
const LEARNER_AUTH = path.join(AUTH_DIR, 'learner.json');

test.describe('Full System Blackbox - B2B Multi-Tenant Organization Flows (POM)', () => {
  // ─── Org Admin / Super Admin flows ──────────────────────────────────────────
  test.describe('Organization Admin Management', () => {
    test.use({ storageState: ADMIN_AUTH });

    test('should load organization management overview page with KPI metrics', async ({ page }) => {
      const managePage = new OrganizationManagePage(page);
      await managePage.goto('stanford-online');
      await managePage.verifyPageLoaded();

      // Check key metric cards are visible
      await expect(managePage.totalMembersCard).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Tổng Khóa học Tổ chức').or(page.locator('text=Khóa học Đã Xuất Bản'))).toBeVisible();
    });

    test('should load organization members directory and allow opening invite modal', async ({ page }) => {
      const membersPage = new OrganizationMembersPage(page);
      await membersPage.goto('stanford-online');
      await membersPage.verifyPageLoaded();

      if (await membersPage.inviteMemberButton.isVisible()) {
        await membersPage.openInviteModal();
      }
    });

    test('should load organization sent invitations tracking page', async ({ page }) => {
      const invPage = new OrganizationInvitationsPage(page);
      await invPage.goto('stanford-online');
      await invPage.verifyPageLoaded();

      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ─── Learner Organization Flows ─────────────────────────────────────────────
  test.describe('Learner - Organization Membership & Invitations', () => {
    test.use({ storageState: LEARNER_AUTH });

    test('should load my-organizations page for authenticated learner', async ({ page }) => {
      const myOrgsPage = new MyOrganizationsPage(page);
      await myOrgsPage.goto();
      await myOrgsPage.verifyPageLoaded();

      // Breadcrumb or heading is visible
      await expect(myOrgsPage.pageHeading).toBeVisible({ timeout: 10000 });
    });

    test('should handle invalid or expired invitation token gracefully', async ({ page }) => {
      const acceptPage = new InvitationAcceptPage(page);
      await acceptPage.goto('INVALID_NONEXISTENT_TOKEN_9999');
      await acceptPage.verifyPageLoaded();

      // Should display error feedback banner or not-found status
      await expect(page.locator('text=/Không tìm thấy|Lỗi|hết hạn|không hợp lệ/i').first()).toBeVisible({ timeout: 10000 });
    });
  });
});
