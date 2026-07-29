import type { GrainPriceList } from '../types';

/**
 * Cennik rzepaku — Komagra Sp. z o.o.
 * Źródło: "PARAMETRY ROZLICZANIA RZEPAKU", dostawa do elewatora w Oleśnicy,
 * kontrakt nr 00034/GOLDK/25 z dnia 15.07.2026.
 *
 * DO WERYFIKACJI U SKUPUJĄCEGO (dokument źródłowy tego nie precyzuje):
 * 1. Wilgotność poniżej 6,00% i zaolejenie poniżej 35,00% — brak zdefiniowanego
 *    przedziału. Silnik rzuci błąd dla takich wartości, dopóki nie dodasz
 *    właściwego przedziału (np. jeśli skup i tak przyjmuje bardzo suchy rzepak
 *    z tą samą stawką dopłaty).
 * 2. Dopłata za zaolejenie powyżej 40% obowiązuje tylko w wariancie "z dopłatą
 *    za poziom zaolejenia" — nie każdy kontrakt ją stosuje. Jeśli Twój konkretny
 *    kontrakt jej nie ma, usuń ten przedział (zostanie tylko potrącenie poniżej 40%).
 * 3. Granice przedziałów (np. "powyżej 10%") zapisane są z dokładnością do 0,01% —
 *    dokument źródłowy nie podaje precyzji większej niż 2 miejsca po przecinku.
 */
export const rzepakKomagra: GrainPriceList = {
  grain: 'rzepak',
  buyer: 'Komagra',
  reference: 'dostawa Oleśnica, kontrakt 00034/GOLDK/25, 15.07.2026',
  parameters: [
    {
      key: 'wilgotnosc',
      label: 'Wilgotność',
      unit: '%',
      basePoint: 9.0,
      step: 0.1,
      brackets: [
        { from: 6.0, to: 8.99, type: 'premium', ratePerStep: 0.05 },
        { from: 9.01, to: 10.0, type: 'deduction', ratePerStep: 0.15 },
        { from: 10.01, to: null, reject: true },
      ],
    },
    {
      key: 'zanieczyszczenia',
      label: 'Zanieczyszczenia razem',
      unit: '%',
      basePoint: 2.0,
      step: 0.1,
      brackets: [
        { from: 0, to: 1.99, type: 'premium', ratePerStep: 0.05 },
        { from: 2.01, to: 4.0, type: 'deduction', ratePerStep: 0.1 },
        { from: 4.01, to: 6.0, type: 'deduction', ratePerStep: 0.2 },
        { from: 6.01, to: null, reject: true },
      ],
    },
    {
      key: 'zaolejenie',
      label: 'Zaolejenie',
      unit: '%',
      basePoint: 40.0,
      step: 0.1,
      brackets: [
        { from: 35.0, to: 39.99, type: 'deduction', ratePerStep: 0.15 },
        // Dopłata powyżej 40% tylko w wariancie "z dopłatą za poziom zaolejenia" — patrz UWAGA 2 wyżej.
        { from: 40.01, to: null, type: 'premium', ratePerStep: 0.15 },
      ],
    },
  ],
};

/**
 * Parametry wymagane przez Komagrę, na które NIE MA tabeli dopłat/potrąceń
 * (są to progi "spełnia/nie spełnia" — przekroczenie = brak przyjęcia dostawy,
 * bez stopniowanych potrąceń). Trzymane osobno, bo nie pasują do modelu
 * `QualityParameter` (brak dopłat cząstkowych) — do wykorzystania np. jako
 * checklista w UI przed obliczeniem ceny.
 */
export const rzepakKomagraHardRequirements = [
  { key: 'kwas_erukowy', label: 'Zawartość kwasu erukowego', unit: '%', max: 2.0 },
  { key: 'glukozynolany', label: 'Zawartość glukozynolanów', unit: 'mikromol/g', max: 25 },
  { key: 'nasiona_porosniete', label: 'Nasiona porośnięte', unit: '%', max: 1.0 },
  { key: 'nasiona_zweglone', label: 'Nasiona o zwęglonym wnętrzu', unit: '%', max: 1.0 },
  { key: 'nasiona_splesniale', label: 'Nasiona spleśniałe', unit: '%', max: 1.0 },
  { key: 'wkt', label: 'WKT', unit: '%', max: 2.0 },
  { key: 'nasiona_przytuli', label: 'Nasiona przytuli', unit: '%', max: 2.0 },
  { key: 'rozkruszki_martwe', label: 'Rozkruszki martwe', unit: 'szt./kg', max: 20 },
] as const;
