import { expect, test, type Page } from '@playwright/test';

/**
 * Przycisk pobierania PDF transportu widoczny jest na liście transportów
 * po rozwinięciu szczegółów.
 */

const TRANSPORT = {
  id: 'pdf-1',
  grain: 'rzepak',
  name: 'Kontrakt PDF/2026',
  description: 'Opis do PDF',
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

test('przycisk PDF jest widoczny po rozwinięciu szczegółów transportu', async ({ page }) => {
  await seed(page);
  await page.goto(`/transporty/${TRANSPORT.grain}`);

  await page.getByRole('button', { name: 'Pokaż szczegóły' }).click();

  const pdfButton = page.getByRole('button', { name: 'PDF' });
  await expect(pdfButton).toBeVisible();
});
