import { test, expect } from '@playwright/test';

// Важно: перед запуском должен быть поднят фронтенд (npm run dev) и бэкенд.

test('главная открывается и показывает заголовок', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Eng yaxshi restoranlardan yetkazib berish' })).toBeVisible();
});

