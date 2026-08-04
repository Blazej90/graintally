import { expect, test, type Page } from '@playwright/test';

/**
 * Kalkulator liczy dostawę jako jedną całość: jedna waga (też gdy ciągnik ma
 * spięte dwie przyczepy) i jedna wspólna próbka. W UI nie ma rozdzielenia na
 * przyczepy — te testy pilnują, żeby nie wróciło.
 */

const LEGACY_SET = {
  id: 'legacy-set-1',
  grain: 'rzepak',
  name: 'Stary zestaw',
  date: '2026-07-14',
  buyer: 'Komagra',
  basePrice: 2380,
  trailerCount: 2,
  trailers: [
    { tonnage: '10', values: { wilgotnosc: '7' }, hardReqValues: {}, hasLabResults: false },
    { tonnage: '14', values: { wilgotnosc: '9' }, hardReqValues: {}, hasLabResults: false },
  ],
  results: [],
  totalValue: 0,
};

async function seed(page: Page, transport: unknown) {
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('klosek-transports', JSON.stringify([t]));
  }, transport);
}

test('nie ma wyboru liczby przyczep — formularz jest jeden', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Jedna przyczepa' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dwie przyczepy' })).toHaveCount(0);
  await expect(page.locator('#transport-tonnage')).toHaveCount(1);
});

test('kalkulator liczy cenę dla całej dostawy', async ({ page }) => {
  await page.goto('/');

  await page.locator('#transport-tonnage').fill('10');
  // wilgotność 7% -> dopłata 20 kroków x 0,05% = +23,80 zł/t
  await page.locator('#transport-wilgotnosc').fill('7');

  await page.getByRole('button', { name: 'Oblicz cenę' }).click();

  await expect(page.getByText(/Dostawa \(10,00 t\)/)).toBeVisible();
  await expect(page.getByText(/403,80 zł\/t/)).toBeVisible();
  // 2403,80 zł/t x 10 t = 24 038,00 zł
  await expect(page.getByText('24 038,00 zł', { exact: true })).toBeVisible();
});

test('przekroczenie limitu badania lab blokuje obliczenie', async ({ page }) => {
  await page.goto('/');

  await page.locator('#labResults').click();
  // kwas erukowy 3% > limit 2%
  await page.locator('#transport-kwas_erukowy').fill('3');

  await page.getByRole('button', { name: 'Oblicz cenę' }).click();

  await expect(page.getByText('Popraw dane transportu.')).toBeVisible();
  await expect(page.getByText(/Dostawa \(/)).toHaveCount(0);
});

test('edycja starego zapisu zestawu sumuje tonaże przyczep w jedną wagę', async ({ page }) => {
  await seed(page, LEGACY_SET);
  await page.goto(`/?edit=${LEGACY_SET.id}`);

  // 10 t + 14 t = 24 t
  await expect(page.locator('#transport-tonnage')).toHaveValue('24');
});
