import { test as base, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '../.auth/user.json');

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      // If no credentials provided, proceed as unauthenticated/guest
      await use(page);
      return;
    }

    // Check if valid saved auth storage state exists
    if (fs.existsSync(AUTH_FILE)) {
      try {
        await page
          .context()
          .addCookies(
            JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')).cookies || []
          );
        await use(page);
        return;
      } catch {
        // Fall back to login below if state is corrupted
      }
    }

    // Perform interactive login
    await page.goto('/login');
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });

    // Save auth state for subsequent tests
    const authDir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    await page.context().storageState({ path: AUTH_FILE });

    await use(page);
  },
});

export { expect };
