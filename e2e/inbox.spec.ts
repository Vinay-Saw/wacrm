import { test, expect } from './fixtures/auth';

test.describe('Inbox View & Navigation', () => {
  test('inbox page renders navigation chrome and handles empty state or thread list', async ({
    authedPage: page,
  }) => {
    const email = process.env.E2E_USER_EMAIL;
    test.skip(
      !email,
      'Skipping authenticated inbox test because E2E_USER_EMAIL is not set'
    );

    await page.goto('/inbox');

    // Verify main inbox container or search/filter bar is present
    await expect(
      page.locator(
        'aside, [data-slot="conversation-list"], input[placeholder*="Search"]'
      )
    ).toBeVisible({
      timeout: 10000,
    });

    // Check if any conversation exists in the list
    const conversationItems = page.locator(
      'button[data-conversation-id], div[data-conversation-id]'
    );
    const count = await conversationItems.count();

    if (count > 0) {
      await conversationItems.first().click();
      // Ensure composer area or thread header is visible
      await expect(
        page.locator('textarea, input[placeholder*="message"], footer')
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
