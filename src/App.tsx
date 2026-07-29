import { useState } from 'react';
import { calculatePrice } from './pricingEngine';
import { rzepakKomagra } from './data/rzepak-komagra';
import type { GrainPriceList, PriceCalculationResult } from './types';

// Na razie tylko rzepak. Kolejne cenniki (pszenica, żyto, pszenżyto, kukurydza)
// dojdą jako kolejne wpisy w tej liście — patrz TODO w README pricing-engine/.
const AVAILABLE_PRICE_LISTS: GrainPriceList[] = [rzepakKomagra];

function App() {
  const [priceList, setPriceList] = useState<GrainPriceList>(AVAILABLE_PRICE_LISTS[0]);
  const [basePrice, setBasePrice] = useState<number>(2380);
  const [tonnage, setTonnage] = useState<number>(1);
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PriceCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCalculate() {
    setError(null);
    try {
      const inputs = priceList.parameters.map((p) => ({
        key: p.key,
        value: rawValues[p.key]
          ? Number(rawValues[p.key].replace(',', '.'))
          : p.basePoint,
      }));
      setResult(calculatePrice(priceList, basePrice, inputs, tonnage));
    } catch (e) {
      setResult(null);
      setError((e as Error).message);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1>Kalkulator skupu zbóż</h1>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Zboże / skupujący
        <select
          style={{ display: 'block', width: '100%' }}
          value={priceList.grain}
          onChange={(e) => {
            const next = AVAILABLE_PRICE_LISTS.find((p) => p.grain === e.target.value);
            if (next) {
              setPriceList(next);
              setRawValues({});
              setResult(null);
            }
          }}
        >
          {AVAILABLE_PRICE_LISTS.map((p) => (
            <option key={p.grain} value={p.grain}>
              {p.grain} ({p.buyer})
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Cena bazowa netto (zł/t)
        <input
          style={{ display: 'block', width: '100%' }}
          type="number"
          value={basePrice}
          onChange={(e) => setBasePrice(Number(e.target.value))}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Tonaż (t)
        <input
          style={{ display: 'block', width: '100%' }}
          type="number"
          value={tonnage}
          onChange={(e) => setTonnage(Number(e.target.value))}
        />
      </label>

      {priceList.parameters.map((p) => (
        <label key={p.key} style={{ display: 'block', marginBottom: 12 }}>
          {p.label} ({p.unit})
          <input
            style={{ display: 'block', width: '100%' }}
            type="text"
            inputMode="decimal"
            value={rawValues[p.key] ?? ''}
            placeholder={String(p.basePoint)}
            onChange={(e) =>
              setRawValues({ ...rawValues, [p.key]: e.target.value })
            }
          />
        </label>
      ))}

      <button onClick={handleCalculate}>Oblicz cenę</button>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {result && (
        <section style={{ marginTop: 16 }}>
          {result.rejected ? (
            <p style={{ color: 'crimson' }}>Brak przyjęcia dostawy: {result.rejectReason}</p>
          ) : (
            <>
              <p>
                Cena końcowa: <strong>{result.finalPricePerTonne} zł/t</strong>
              </p>
              <p>
                Wartość dostawy: <strong>{result.totalValue} zł</strong>
              </p>
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
