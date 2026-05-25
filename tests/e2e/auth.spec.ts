import { expect, test } from '@playwright/test';

test('login page renders the magic link form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText(/enlace mágico|magic link/i)).toBeVisible();
  await expect(page.getByLabel(/correo|email/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /enviar|send/i }),
  ).toBeVisible();
});

test('invalid email shows validation error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/correo|email/i).fill('not-an-email');
  await page.getByRole('button', { name: /enviar|send/i }).click();
  await expect(
    page.locator('text=/inválido|invalid/i').first(),
  ).toBeVisible();
});

test('protected route redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForURL(/\/login/, { timeout: 5000 });
  expect(page.url()).toMatch(/\/login/);
});
