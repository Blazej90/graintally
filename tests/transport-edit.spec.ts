import { expect, test, type Page } from '@playwright/test';

/**
 * Tryb edycji transportu (`/?edit=<id>`).
 *
 * Formularz kalkulatora wypełniał się kiedyś efektem przepisującym pięć
 * setterów po zamontowaniu. Po przejściu na inicjalizację w useState + `key`
 * na wrapperze (patrz CalculatorPage) całe wypełnianie dzieje się na pierwszym
 * renderze, a wyjście z trybu edycji polega na przemontowaniu komponentu.
 * Te testy pilnują, żeby jedno i drugie faktycznie działało.
 */

const TRANSPORT = {
  id: 'edit-1',
  grain: 'rzepak',
  name: 'Kontrakt 77/2026',
  description: 'Opis testowy',
  date: '2026-07-14',
  buyer: 'Komagra',
  basePrice: 2500,
  trailerCount: 1,
  trailers: [
    {
      tonnage: '24',
      values: { wilgotnosc: '7', zanieczyszczenia: '4' },
      hardReqValues: {},
      hasLabResults: true,
    },
  ],
  results: [],
  totalValue: 0,
};

async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('klosek-transports', JSON.stringify([t]));
  }, TRANSPORT);
}

test('wchodzi w tryb edycji z wypełnionymi danymi transportu', async ({ page }) => {
  await seed(page);
  await page.goto(`/?edit=${TRANSPORT.id}`);

  await expect(page.locator('#basePrice')).toHaveValue(String(TRANSPORT.basePrice));
  await expect(page.getByRole('button', { name: 'Zapisz zmiany' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Anuluj edycję' })).toBeVisible();
});

test('modal zapisu dziedziczy nazwę i datę edytowanego transportu', async ({ page }) => {
  await seed(page);
  await page.goto(`/?edit=${TRANSPORT.id}`);

  await page.getByRole('button', { name: 'Zapisz zmiany' }).click();

  const dialog = page.locator('[role=dialog]');
  await expect(dialog.getByText('Edytuj transport')).toBeVisible();
  await expect(dialog.locator('#transport-name')).toHaveValue(TRANSPORT.name);
  // 2026-07-14 pokazywane jako 14.07.2026
  await expect(dialog.locator('#transport-date')).toHaveText('14.07.2026');
});

test('"Wyczyść" wychodzi z trybu edycji i przywraca wartości domyślne', async ({ page }) => {
  await seed(page);
  await page.goto(`/?edit=${TRANSPORT.id}`);

  await page.getByRole('button', { name: 'Oblicz cenę' }).click();
  await page.getByRole('button', { name: 'Wyczyść' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#basePrice')).toHaveValue('2380');
  await expect(page.getByRole('button', { name: 'Zapisz transport' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Anuluj edycję' })).toHaveCount(0);
});

test('wejście na kalkulator bez parametru edit daje czysty formularz', async ({ page }) => {
  await seed(page);
  await page.goto('/');

  await expect(page.locator('#basePrice')).toHaveValue('2380');
  await expect(page.getByRole('button', { name: 'Zapisz transport' })).toBeVisible();
});
