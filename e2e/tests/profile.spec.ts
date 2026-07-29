import { test, expect } from '@playwright/test';
import { ProfilePage } from '../pages';
import { E2E_CONFIG } from '../config/credentials';
import { LoginPage } from '../pages';

test.describe('Full System Blackbox - Profile Flow (POM)', () => {
  // Use a logged-in state before each test
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    const { email, password } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, password);
  });

  test('should display edit profile button and edit form correctly', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.verifyPageLoaded();

    await expect(profilePage.editProfileButton).toBeVisible();

    await profilePage.editProfileButton.click();
    await expect(profilePage.fullNameInput).toBeVisible();
    await expect(profilePage.avatarUrlInput).toBeVisible();
    await expect(profilePage.saveButton).toBeVisible();
    await expect(profilePage.cancelButton).toBeVisible();
  });

  test('should update profile name and avatar successfully', async ({ page }) => {
    const profilePage = new ProfilePage(page);
    await profilePage.goto();
    await profilePage.verifyPageLoaded();

    const uniqueName = `Test User Updated ${Date.now()}`;
    const newAvatarUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=test1234';

    await profilePage.editProfile(uniqueName, newAvatarUrl);

    // Wait for the form to submit and page to re-render without form
    await expect(profilePage.saveButton).toBeHidden({ timeout: 10000 });
    
    // Verify name has been updated
    await expect(profilePage.profileNameHeader).toHaveText(uniqueName, { timeout: 5000 });
  });
});
