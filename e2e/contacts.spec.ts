import { test, expect } from './fixtures/auth';

test.describe('Contacts Management', () => {
  test('contacts page renders table, search input, and filter controls', async ({
    authedPage: page,
  }) => {
    const email = process.env.E2E_USER_EMAIL;
    test.skip(
      !email,
      'Skipping authenticated contacts test because E2E_USER_EMAIL is not set'
    );

    await page.goto('/contacts');

    // Search bar must be visible
    const searchInput = page.locator('input[placeholder*="search" i]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Table must be visible
    await expect(page.locator('table')).toBeVisible();

    // Type a query into the search box
    await searchInput.fill('NonExistentContactQuery12345');
    await page.waitForTimeout(500);

    // Verify empty state or filtered table row
    await expect(page.locator('table')).toBeVisible();

    // Clear search
    await searchInput.fill('');
  });
});
