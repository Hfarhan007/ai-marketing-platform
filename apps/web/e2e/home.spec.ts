import { expect, test } from '@playwright/test';

test('shows the landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /transform bold ideas/i })).toBeVisible();
});

test('@accessibility exposes landmarks, a single primary heading, and keyboard navigation', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus-visible')).toBeVisible();
});
