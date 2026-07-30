import { expect, test, type Page } from '@playwright/test';

/**
 * Regresja kalendarza.
 *
 * Historia: shadcn generuje komponenty bez `forwardRef` (styl React 19). Na
 * React 18 taki komponent cicho gubił ref, przez co Radix Slot nie przekazywał
 * go do Buttona, Popover nie miał elementu kotwiczącego, a Floating UI nigdy
 * nie liczyło pozycji — popover zostawał na `transform: translate(0, -200%)`,
 * czyli kilkaset pikseli nad ekranem.
 *
 * Dlatego te testy sprawdzają POZYCJĘ popovera, a nie samą jego obecność w DOM:
 * przy tamtym błędzie kalendarz był kompletny, widoczny dla `toBeVisible()`
 * i miał wszystkie 35 przycisków dni. Tylko nie dało się go zobaczyć.
 */

const TRANSPORT = {
  id: 'e2e-1',
  grain: 'rzepak',
  name: 'Kontrakt testowy',
  buyer: 'Komagra',
  date: '2026-07-01',
  basePrice: 2380,
  trailerCount: 1,
  trailers: [],
  results: [],
  totalValue: 23562,
};

/** Zbiera ostrzeżenia Reacta o zgubionych refach — objaw źródłowego błędu. */
function collectRefWarnings(page: Page): string[] {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().includes('cannot be given refs')) {
      warnings.push(m.text().split('\n')[0]);
    }
  });
  return warnings;
}

async function seedTransport(page: Page) {
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('klosek-transports', JSON.stringify([t]));
  }, TRANSPORT);
}

/** Popover musi mieścić się w oknie — to jest właściwa asercja regresji. */
async function expectPopoverOnScreen(page: Page) {
  const popover = page.locator('[data-slot=popover-content]').first();
  await expect(popover).toBeVisible();

  const box = await popover.boundingBox();
  const viewport = page.viewportSize();
  expect(box, 'popover nie ma wymiarów').not.toBeNull();
  expect(viewport).not.toBeNull();

  expect.soft(box!.x, 'popover ucieka za lewą krawędź').toBeGreaterThanOrEqual(0);
  expect.soft(box!.y, 'popover ucieka nad górną krawędź').toBeGreaterThanOrEqual(0);
  expect
    .soft(box!.x + box!.width, 'popover ucieka za prawą krawędź')
    .toBeLessThanOrEqual(viewport!.width);
  expect
    .soft(box!.y + box!.height, 'popover ucieka pod dolną krawędź')
    .toBeLessThanOrEqual(viewport!.height);

  // Przy błędzie ref-a kalendarz też miał 35 dni — sprawdzamy je dopiero po
  // pozycji, żeby raport wskazywał właściwą przyczynę.
  await expect(popover.locator('button[data-day]')).toHaveCount(35);
}

async function openDateFilter(page: Page, mode: 'Konkretny dzień' | 'Zakres dat') {
  await page.goto('/transporty/rzepak');
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: mode }).click();
}

const dayButtons = (page: Page) => page.locator('[data-slot=popover-content] button[data-day]');
const pickerTrigger = (page: Page) => page.locator('button:has(svg.lucide-calendar)').first();

test.describe('kalendarz w modalu "Zapisz transport"', () => {
  test('otwiera się w widocznym obszarze i ustawia datę', async ({ page }) => {
    const refWarnings = collectRefWarnings(page);

    await page.goto('/');
    await page.locator('#basePrice').fill('2380');
    await page.getByRole('button', { name: 'Zapisz transport' }).click();

    const dialog = page.locator('[role=dialog]');
    await expect(dialog).toBeVisible();
    await dialog.locator('#transport-date').click();

    await expectPopoverOnScreen(page);

    await dayButtons(page).nth(14).click();
    await expect(dialog.locator('#transport-date')).toHaveText(/\d{2}\.\d{2}\.\d{4}/);

    expect(refWarnings, 'Radix zgubił ref — patrz nagłówek pliku').toEqual([]);
  });
});

test.describe('kalendarz w filtrach "Moje transporty"', () => {
  test('otwiera się w widocznym obszarze i ustawia datę', async ({ page }) => {
    const refWarnings = collectRefWarnings(page);

    await seedTransport(page);
    await openDateFilter(page, 'Konkretny dzień');
    await pickerTrigger(page).click();

    await expectPopoverOnScreen(page);

    await dayButtons(page).nth(14).click();
    await expect(pickerTrigger(page)).toHaveText(/\d{2}\.\d{2}\.\d{4}/);

    expect(refWarnings, 'Radix zgubił ref — patrz nagłówek pliku').toEqual([]);
  });

  test('nawigacja miesiącami przesuwa nagłówek', async ({ page }) => {
    await seedTransport(page);
    await openDateFilter(page, 'Konkretny dzień');
    await pickerTrigger(page).click();

    const caption = page.locator('[data-slot=popover-content] [class*=month_caption]').first();
    const before = await caption.textContent();

    await page.locator('[data-slot=popover-content] [class*=button_next]').first().click();
    await expect(caption).not.toHaveText(before ?? '');
  });
});

test.describe('wybór zakresu dat', () => {
  // Regresja: popover zamykał się po pierwszym kliknięciu i ustawiał zakres
  // jednodniowy, bo addToRange dla pustego zakresu zwraca od razu
  // { from: d, to: d }, a komponent traktował to jako komplet.
  test('pierwsze kliknięcie nie zamyka popovera, drugie domyka zakres', async ({ page }) => {
    await seedTransport(page);
    await openDateFilter(page, 'Zakres dat');
    await pickerTrigger(page).click();
    await expectPopoverOnScreen(page);

    const labelBefore = await pickerTrigger(page).textContent();

    await dayButtons(page).nth(9).click();
    await expect(dayButtons(page).first(), 'popover zamknął się po 1. kliknięciu').toBeVisible();
    await expect(pickerTrigger(page), 'zakres zatwierdzony przedwcześnie').toHaveText(
      labelBefore ?? ''
    );

    await dayButtons(page).nth(16).click();
    await expect(page.locator('[data-slot=popover-content]')).toHaveCount(0);
    await expect(pickerTrigger(page)).toHaveText(/\d{2}\.\d{2}\.\d{4} - \d{2}\.\d{2}\.\d{4}/);
  });

  test('kliknięcie wstecz porządkuje zakres rosnąco', async ({ page }) => {
    await seedTransport(page);
    await openDateFilter(page, 'Zakres dat');
    await pickerTrigger(page).click();

    await dayButtons(page).nth(20).click();
    await dayButtons(page).nth(6).click();

    const label = (await pickerTrigger(page).textContent())!;
    const [start, end] = label.split(' - ').map((s) => s.trim().split('.').reverse().join('-'));
    expect(new Date(start).getTime()).toBeLessThan(new Date(end).getTime());
  });

  test('zamknięcie po pierwszym kliknięciu porzuca niedokończony wybór', async ({ page }) => {
    await seedTransport(page);
    await openDateFilter(page, 'Zakres dat');

    const before = await pickerTrigger(page).textContent();

    await pickerTrigger(page).click();
    await dayButtons(page).nth(2).click();
    await page.keyboard.press('Escape');

    await expect(pickerTrigger(page)).toHaveText(before ?? '');
  });

  test('zapisany zakres podświetla się po ponownym otwarciu', async ({ page }) => {
    await seedTransport(page);
    await openDateFilter(page, 'Zakres dat');

    await pickerTrigger(page).click();
    await dayButtons(page).nth(9).click();
    await dayButtons(page).nth(16).click();

    await pickerTrigger(page).click();
    const popover = page.locator('[data-slot=popover-content]');
    await expect(popover.locator('button[data-range-start=true]')).toHaveCount(1);
    await expect(popover.locator('button[data-range-end=true]')).toHaveCount(1);
    await expect(popover.locator('button[data-range-middle=true]')).toHaveCount(6);
  });
});

test.describe('nakładki Radixa', () => {
  // Dialog, Sheet i AlertDialog dostają ref od <Presence>. Gdy przepada,
  // konsola sypie ostrzeżeniami, a animacja zamykania traci pomiar.
  test('otwierają się i zamykają bez ostrzeżeń o refach', async ({ page }) => {
    const refWarnings = collectRefWarnings(page);
    await page.setViewportSize({ width: 400, height: 800 }); // Sheet zamiast nawigacji desktopowej

    await seedTransport(page);

    // Sheet — nawigacja mobilna
    await page.goto('/');
    await page.locator('header button').last().click();
    await expect(page.locator('[role=dialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[role=dialog]')).toHaveCount(0);

    // Dialog — zapis transportu
    await page.locator('#basePrice').fill('2380');
    await page.getByRole('button', { name: 'Zapisz transport' }).click();
    await expect(page.locator('[role=dialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[role=dialog]')).toHaveCount(0);

    // AlertDialog — usuwanie transportu
    await page.goto('/transporty/rzepak');
    await page.getByRole('button', { name: /Usuń/ }).first().click();
    await expect(page.locator('[role=alertdialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[role=alertdialog]')).toHaveCount(0);

    expect(refWarnings, 'Radix zgubił ref — patrz nagłówek pliku').toEqual([]);
  });
});
