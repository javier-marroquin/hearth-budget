import { expect, test } from '@playwright/test';

test('login page renders email and password form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText(/bienvenido|welcome back/i)).toBeVisible();
  await expect(page.getByLabel(/correo|email/i)).toBeVisible();
  await expect(page.getByLabel(/^contraseña$|^password$/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /iniciar sesión|sign in/i }),
  ).toBeVisible();
});

test('sign up tab shows registration fields', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('tab', { name: /crear cuenta|sign up/i }).click();
  await expect(page.getByLabel(/confirmar|confirm password/i)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /crear cuenta|create account/i }),
  ).toBeVisible();
});

test('invalid email shows validation error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/correo|email/i).fill('not-an-email');
  await page.getByLabel(/^contraseña$|^password$/i).fill('password123');
  await page.getByRole('button', { name: /iniciar sesión|sign in/i }).click();
  await expect(
    page.locator('text=/inválido|invalid/i').first(),
  ).toBeVisible();
});

test('protected route redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForURL(/\/login/, { timeout: 5000 });
  expect(page.url()).toMatch(/\/login/);
});
