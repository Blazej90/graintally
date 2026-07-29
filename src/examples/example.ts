import { calculatePrice } from '../pricingEngine';
import { rzepakKomagra } from '../data/rzepak-komagra';

function run(label: string, zanieczyszczenia: number) {
  const result = calculatePrice(
    rzepakKomagra,
    2380, // cena bazowa netto, zł/t
    [
      { key: 'wilgotnosc', value: 7.0 },
      { key: 'zanieczyszczenia', value: zanieczyszczenia },
    ],
    10 // tonaż, np. 10 t
  );

  console.log(`\n=== ${label} ===`);
  for (const r of result.parameterResults) {
    const sign = r.amountPerTonne > 0 ? '+' : '';
    console.log(
      `  ${r.label}: ${r.value}% -> ${r.type} (${r.steps} kroków x ${r.ratePerStep}%) = ${sign}${r.amountPerTonne} zł/t`
    );
  }
  console.log(`  Cena końcowa: ${result.finalPricePerTonne} zł/t`);
  console.log(`  Wartość dostawy (${result.tonnage} t): ${result.totalValue} zł`);
}

run('Zanieczyszczenia 4,00%', 4.0);
run('Zanieczyszczenia 6,00%', 6.0);

// Kontrola zgodności z ręcznym wyliczeniem z rozmowy:
// wilgotność 7% -> +23,80 zł/t
// zanieczyszczenia 4,00% -> -47,60 zł/t => cena 2356,20 zł/t
// zanieczyszczenia 6,00% -> -190,40 zł/t => cena 2213,40 zł/t
const check1 = calculatePrice(rzepakKomagra, 2380, [
  { key: 'wilgotnosc', value: 7.0 },
  { key: 'zanieczyszczenia', value: 4.0 },
], 1);
const check2 = calculatePrice(rzepakKomagra, 2380, [
  { key: 'wilgotnosc', value: 7.0 },
  { key: 'zanieczyszczenia', value: 6.0 },
], 1);

console.assert(check1.finalPricePerTonne === 2356.2, 'Oczekiwano 2356.20 zł/t dla zanieczyszczeń 4,00%');
console.assert(check2.finalPricePerTonne === 2213.4, 'Oczekiwano 2213.40 zł/t dla zanieczyszczeń 6,00%');

// Kontrola zaolejenia: 40% = cena bazowa, 38% = potrącenie, 42% = dopłata.
const olej40 = calculatePrice(rzepakKomagra, 2380, [
  { key: 'zaolejenie', value: 40.0 },
], 1);
const olej38 = calculatePrice(rzepakKomagra, 2380, [
  { key: 'zaolejenie', value: 38.0 },
], 1);
const olej42 = calculatePrice(rzepakKomagra, 2380, [
  { key: 'zaolejenie', value: 42.0 },
], 1);

console.assert(olej40.finalPricePerTonne === 2380.0, 'Oczekiwano 2380.00 zł/t dla zaolejenia 40,00%');
console.assert(olej38.finalPricePerTonne === 2308.6, 'Oczekiwano 2308.60 zł/t dla zaolejenia 38,00%');
console.assert(olej42.finalPricePerTonne === 2451.4, 'Oczekiwano 2451.40 zł/t dla zaolejenia 42,00%');

console.log('\nKontrola zgodności z ręcznym wyliczeniem: OK');
