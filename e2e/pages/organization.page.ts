import { Page, Locator, expect } from '@playwright/test';

export class MyOrganizationsPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly orgCards: Locator;
  readonly pendingInvitationsDrawerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1', { hasText: 'Tổ chức của tôi' });
    this.orgCards = page.locator('a[href^="/organizations/"]');
    this.pendingInvitationsDrawerButton = page.getByRole('button', { name: /Lời mời đang chờ/i });
  }

  async goto() {
    await this.page.goto('/my-organizations', { waitUntil: 'networkidle' });
  }

  async verifyPageLoaded() {
    await expect(this.pageHeading).toBeVisible({ timeout: 15000 });
  }
}

export class OrganizationManagePage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly totalMembersCard: Locator;
  readonly navTabs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1');
    this.totalMembersCard = page.locator('text=Tổng Thành viên').first();
    this.navTabs = page.locator('nav a');
  }

  async goto(slug: string = 'stanford-online') {
    await this.page.goto(`/organizations/${slug}/manage`, { waitUntil: 'networkidle' });
  }

  async verifyPageLoaded() {
    await expect(this.totalMembersCard).toBeVisible({ timeout: 15000 });
  }
}

export class OrganizationMembersPage {
  readonly page: Page;
  readonly inviteMemberButton: Locator;
  readonly inviteModal: Locator;
  readonly emailInput: Locator;
  readonly roleSelect: Locator;
  readonly messageTextarea: Locator;
  readonly submitInviteButton: Locator;
  readonly searchInput: Locator;
  readonly membersTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inviteMemberButton = page.getByRole('button', { name: /Gửi Lời mời Thành viên Mới|Mời Thành viên/i }).first();
    this.inviteModal = page.locator('h2, h3, [role="dialog"]').filter({ hasText: /Gửi Lời mời Thành viên/i }).first();
    this.emailInput = page.locator('input[placeholder*="user@organization.org"], input[type="email"]');
    this.roleSelect = page.locator('select, [role="combobox"]').first();
    this.messageTextarea = page.locator('textarea[placeholder*="Chào mừng bạn đến với tổ chức"]');
    this.submitInviteButton = page.getByRole('button', { name: /Gửi lời mời/i }).last();
    this.searchInput = page.locator('input[placeholder*="Tìm kiếm thành viên"]');
    this.membersTable = page.locator('table');
  }

  async goto(slug: string = 'stanford-online') {
    await this.page.goto(`/organizations/${slug}/members`, { waitUntil: 'networkidle' });
  }

  async verifyPageLoaded() {
    await expect(this.page.locator('h1, h2').filter({ hasText: /Danh sách Thành viên|Thành viên/i }).first()).toBeVisible({ timeout: 15000 });
  }

  async openInviteModal() {
    await this.page.waitForLoadState('networkidle');
    await expect(this.inviteMemberButton).toBeVisible({ timeout: 10000 });
    await expect(this.inviteMemberButton).toBeEnabled({ timeout: 5000 });
    await this.inviteMemberButton.click();
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
  }
}

export class OrganizationInvitationsPage {
  readonly page: Page;
  readonly pageHeading: Locator;
  readonly invitationsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageHeading = page.locator('h1, h2').filter({ hasText: /Lời mời đã gửi|Quản lý Lời mời/i });
    this.invitationsTable = page.locator('table');
  }

  async goto(slug: string = 'stanford-online') {
    await this.page.goto(`/organizations/${slug}/invitations`, { waitUntil: 'networkidle' });
  }

  async verifyPageLoaded() {
    await expect(this.page.locator('body')).toBeVisible({ timeout: 15000 });
  }
}

export class InvitationAcceptPage {
  readonly page: Page;
  readonly acceptButton: Locator;
  readonly declineButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.acceptButton = page.getByRole('button', { name: /Chấp nhận lời mời|Tham gia/i });
    this.declineButton = page.getByRole('button', { name: /Từ chối/i });
    this.errorAlert = page.locator('text=/Không tìm thấy|Lỗi|hết hạn/i');
  }

  async goto(token: string) {
    await this.page.goto(`/invitations/${token}`, { waitUntil: 'networkidle' });
  }

  async verifyPageLoaded() {
    await expect(this.page.locator('body')).toBeVisible({ timeout: 15000 });
  }
}
