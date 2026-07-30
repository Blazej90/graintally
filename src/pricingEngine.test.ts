import { describe, expect, it } from 'vitest';
import { calculatePrice } from '@/pricingEngine';
import { rzepakKomagra } from '@/data/rzepak-komagra';

const BASE_PRICE = 2380;

function price(inputs: { key: string; value: number }[], tonnage = 1) {
  return calculatePrice(rzepakKomagra, BASE_PRICE, inputs, tonnage);
}

describe('calculatePrice — rzepak Komagra', () => {
  // Scenariusze przeniesione z examples/example.ts: liczby pochodzą z ręcznego
  // wyliczenia na dokumencie Komagry, nie z uruchomienia silnika.
  describe('zgodność z ręcznym wyliczeniem', () => {
    it('wilgotność 7% + zanieczyszczenia 4% daje 2356,20 zł/t', () => {
      const result = price([
        { key: 'wilgotnosc', value: 7.0 },
        { key: 'zanieczyszczenia', value: 4.0 },
      ]);
      expect(result.finalPricePerTonne).toBe(2356.2);
    });

    it('wilgotność 7% + zanieczyszczenia 6% daje 2213,40 zł/t', () => {
      const result = price([
        { key: 'wilgotnosc', value: 7.0 },
        { key: 'zanieczyszczenia', value: 6.0 },
      ]);
      expect(result.finalPricePerTonne).toBe(2213.4);
    });
  });

  describe('zaolejenie', () => {
    it.each([
      [40.0, 2380.0, 'baza'],
      [38.0, 2308.6, 'potrącenie'],
      [42.0, 2451.4, 'dopłata'],
    ])('%s%% daje %s zł/t (%s)', (value, expected) => {
      expect(price([{ key: 'zaolejenie', value }]).finalPricePerTonne).toBe(expected);
    });
  });

  describe('wilgotność', () => {
    it.each([
      [7.0, 2403.8, 'dopłata'],
      [9.0, 2380.0, 'baza'],
      [9.5, 2362.15, 'potrącenie'],
    ])('%s%% daje %s zł/t (%s)', (value, expected) => {
      expect(price([{ key: 'wilgotnosc', value }]).finalPricePerTonne).toBe(expected);
    });

    it('10,01% odrzuca dostawę i zeruje cenę', () => {
      const result = price([{ key: 'wilgotnosc', value: 10.01 }]);
      expect(result.rejected).toBe(true);
      expect(result.finalPricePerTonne).toBe(0);
      expect(result.totalValue).toBe(0);
    });
  });

  describe('zaokrąglanie kroków w górę', () => {
    // "Za każde rozpoczęte 0,1%" — Math.ceil, nie Math.round. Rozpoczęty krok
    // liczy się tak samo jak pełny, więc 9,11% i 9,20% muszą dać ten sam wynik.
    it('rozpoczęty krok liczy się jak pełny', () => {
      const zaczety = price([{ key: 'wilgotnosc', value: 9.11 }]);
      const pelny = price([{ key: 'wilgotnosc', value: 9.2 }]);
      expect(zaczety.finalPricePerTonne).toBe(pelny.finalPricePerTonne);
    });

    it('kolejny rozpoczęty krok potrąca więcej niż poprzedni pełny', () => {
      const dwaKroki = price([{ key: 'wilgotnosc', value: 9.2 }]);
      const trzyKroki = price([{ key: 'wilgotnosc', value: 9.21 }]);
      expect(trzyKroki.finalPricePerTonne).toBeLessThan(dwaKroki.finalPricePerTonne);
    });
  });

  describe('wartość dostawy', () => {
    it('mnoży cenę końcową przez tonaż', () => {
      const result = price(
        [
          { key: 'wilgotnosc', value: 7.0 },
          { key: 'zanieczyszczenia', value: 4.0 },
        ],
        10
      );
      expect(result.finalPricePerTonne).toBe(2356.2);
      expect(result.totalValue).toBe(23562);
    });
  });
});
