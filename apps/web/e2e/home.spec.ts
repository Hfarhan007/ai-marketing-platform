import { expect, test } from '@playwright/test';

test('shows the landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /transform bold ideas/i })).toBeVisible();
});
