import { expect, test } from '@playwright/test';

test('unknown route renders the 404 page', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByText('404')).toBeVisible();
  await expect(page.getByRole('link', { name: /volver/i })).toBeVisible();
});

test('check email page redirects without an email param', async ({ page }) => {
  await page.goto('/auth/check-email');
  await page.waitForURL(/\/login/, { timeout: 5000 });
});
