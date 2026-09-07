import { test, expect } from './fixtures/auth';

test.describe('Navigation & Console Integrity', () => {
  test('public auth routes load without critical errors', async ({ page }) => {
    const publicRoutes = ['/login', '/signup', '/forgot-password'];

    for (const route of publicRoutes) {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);

      // Verify no React hydration errors or uncaught script crashes
      const fatalErrors = consoleErrors.filter(
        (e) =>
          e.includes('Hydration failed') || e.includes('Uncaught exception')
      );
      expect(fatalErrors).toHaveLength(0);
    }
  });

  test('dashboard navigation links render correctly when authenticated', async ({
    authedPage: page,
  }) => {
    const email = process.env.E2E_USER_EMAIL;
    test.skip(
      !email,
      'Skipping authenticated navigation test because E2E_USER_EMAIL is not set'
    );

    const dashboardRoutes = [
      '/dashboard',
      '/contacts',
      '/inbox',
      '/pipelines',
      '/settings',
    ];

    for (const route of dashboardRoutes) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
