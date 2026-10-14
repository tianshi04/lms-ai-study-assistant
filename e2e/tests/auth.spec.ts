import { test, expect } from '@playwright/test';
import { LoginPage, RegisterPage } from '../pages';
import { E2E_CONFIG } from '../config/credentials';

test.describe('Full System Blackbox - Authentication Flow (POM)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('should display login page form elements', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();
  });

  test('should login successfully with valid learner credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    const { email, password } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, password);

    // Should redirect to homepage or dashboard after login
    await expect(page).toHaveURL(/\/(courses|learn|learner\/dashboard|account-settings)?$/, { timeout: 15000 });
  });

  test('should show error message when login fails with wrong password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    const { email } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, 'wrong_password_999999');

    // Error alert banner should appear
    await expect(loginPage.errorBanner).toBeVisible({ timeout: 5000 });
  });

  test('should navigate from login to register page via link', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.verifyPageLoaded();

    await loginPage.registerLink.click();
    await expect(page).toHaveURL(/\/auth\/register/, { timeout: 5000 });
  });

  test('should start Google registration with state and nonce (no mock bypass)', async ({ page }) => {
    // Never hit real Google from CI; we only inspect the outgoing authorization request.
    await page.route('https://accounts.google.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }),
    );

    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await registerPage.verifyPageLoaded();

    // Either the app redirects to Google, or (Google not configured) a toast appears briefly.
    // Wait for both at once: the toast auto-dismisses, so it must not be awaited after a timeout.
    const outcome = Promise.race([
      page
        .waitForRequest(/accounts\.google\.com\/o\/oauth2\/v2\/auth/, { timeout: 15000 })
        .then((req) => ({ kind: 'google' as const, req }))
        .catch(() => ({ kind: 'timeout' as const })),
      page
        .getByText(/chưa được cấu hình/i)
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => ({ kind: 'not-configured' as const }))
        .catch(() => ({ kind: 'timeout' as const })),
    ]);
    await registerPage.googleButton.click();
    const result = await outcome;
    if (result.kind === 'timeout') {
      throw new Error('Neither a Google redirect nor a "not configured" message appeared');
    }

    if (result.kind === 'not-configured') {
      // Must fail closed: stay on the page, never fall back to a mock.
      await expect(page).toHaveURL(/\/auth\/register/);
      return;
    }
    const request = result.req;

    const params = new URL(request.url()).searchParams;
    expect(params.get('response_type')).toBe('code');
    expect(params.get('state')).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(params.get('nonce')).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(params.get('redirect_uri')).toMatch(/\/auth\/google\/callback$/);
  });

  test('should fail closed on a Google callback without a matching state', async ({ page }) => {
    await page.goto('/auth/google/callback?code=forged-code&state=forged-state');

    await expect(page.getByText(/không hợp lệ hoặc đã hết hạn/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    await expect(page.context().cookies()).resolves.not.toContainEqual(
      expect.objectContaining({ name: 'access_token' }),
    );
  });

  test('should return to login when the user denies Google consent', async ({ page }) => {
    await page.goto('/auth/google/callback?error=access_denied');

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  test('should ignore a backslash open-redirect target after login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto('/\\evil.example.com');
    await loginPage.verifyPageLoaded();

    const { email, password } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, password);

    await expect(page).toHaveURL(/\/learner\/dashboard/, { timeout: 20000 });
    expect(new URL(page.url()).hostname).not.toContain('evil');
  });

  test('should redirect to requested URL parameter after successful login', async ({ page, context }) => {
    // Clear storage state to guarantee unauthenticated initial state for redirect test
    await context.clearCookies();
    await page.addInitScript(() => localStorage.clear());

    const loginPage = new LoginPage(page);
    await loginPage.goto('/account-settings');

    const { email, password } = E2E_CONFIG.credentials.learner;
    await loginPage.login(email, password);

    // Should redirect specifically to /account-settings
    await expect(page).toHaveURL(/\/account-settings/, { timeout: 20000 });
  });
});
