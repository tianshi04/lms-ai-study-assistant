import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate user state', async ({ page }) => {
  // Ensure .auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Check if target authentication setup is needed or save initial clean storage state
  await page.goto('/');
  await page.context().storageState({ path: authFile });
});
