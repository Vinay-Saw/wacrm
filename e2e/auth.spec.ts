import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('login page renders email, password inputs and sign-in button', async ({
    page,
  }) => {
    await page.goto('/login');

    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input#email', 'invalid-user@example.com');
    await page.fill('input#password', 'wrong-password-12345');
    await page.click('button[type="submit"]');

    // Supabase will display an error message box
    await expect(page.locator('.text-red-400')).toBeVisible({ timeout: 10000 });
  });

  test('logs in successfully with valid credentials if configured', async ({
    page,
  }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    test.skip(
      !email || !password,
      'E2E_USER_EMAIL or E2E_USER_PASSWORD not configured'
    );

    await page.goto('/login');
    await page.fill('input#email', email!);
    await page.fill('input#password', password!);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });
});
