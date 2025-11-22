import { test, expect } from '@playwright/test';

test.describe('Unit dropdown search', () => {
  test('selects cubic millimeter via search', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('from-unit-trigger').click();
    await page.getByPlaceholder('Search units…').fill('mm3');
    await expect(page.getByRole('button', { name: /cubic millimeter/i })).toBeVisible();
    await page.getByRole('button', { name: /cubic millimeter/i }).click();

    await expect(page.getByTestId('from-unit-trigger')).toContainText(/mm³/i);
  });

  test('searching kWh surfaces kilowatt hour in fuel efficiency/energy', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('to-unit-trigger').click();
    await page.getByPlaceholder('Search units…').fill('kilow');
    await expect(page.getByRole('button', { name: /kilowatt hour/i })).toBeVisible();
    await page.getByRole('button', { name: /kilowatt hour/i }).click();

    await expect(page.getByTestId('to-unit-trigger')).toContainText(/kWh/i);
  });
});

test.describe('Swap button', () => {
  test('swaps from/to units', async ({ page }) => {
    await page.goto('/');

    const fromBefore = await page.getByTestId('from-unit-trigger').textContent();
    const toBefore = await page.getByTestId('to-unit-trigger').textContent();

    await page.getByRole('button', { name: /swap units/i }).click();

    const fromAfter = await page.getByTestId('from-unit-trigger').textContent();
    const toAfter = await page.getByTestId('to-unit-trigger').textContent();

    expect(fromAfter).toEqual(toBefore);
    expect(toAfter).toEqual(fromBefore);
  });
});

