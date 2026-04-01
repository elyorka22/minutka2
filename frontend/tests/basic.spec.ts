import { test, expect } from '@playwright/test';

// Важно: перед запуском должен быть поднят фронтенд (npm run dev) и бэкенд.

test('главная открывается и показывает заголовок', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/Minutka/i);
});

