import { useMemo, useState } from 'react';
import { calculatePrice } from '@/pricingEngine';
import { rzepakKomagra, rzepakKomagraHardRequirements } from '@/data/rzepak-komagra';
import type { GrainPriceList, PriceCalculationResult } from '@/types';

const AVAILABLE_PRICE_LISTS: GrainPriceList[] = [rzepakKomagra];

function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '' || normalized === '.' || normalized === '-') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(n: number): string {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function App() {
  const [priceList, setPriceList] = useState<GrainPriceList>(AVAILABLE_PRICE_LISTS[0]);
  const [rawBasePrice, setRawBasePrice] = useState<string>('2380');
  const [rawTonnage, setRawTonnage] = useState<string>('1');
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const [hardReqValues, setHardReqValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<PriceCalculationResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const basePriceNum = parseDecimal(rawBasePrice);
  const tonnageNum = parseDecimal(rawTonnage);

  const parameterNumbers = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const p of priceList.parameters) {
      out[p.key] = parseDecimal(rawValues[p.key] ?? '');
    }
    return out;
  }, [priceList.parameters, rawValues]);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};

    if (rawBasePrice.trim() !== '' && (basePriceNum === null || basePriceNum <= 0)) {
      next.basePrice = 'Podaj dodatnią cenę bazową.';
    }
    if (rawTonnage.trim() !== '' && (tonnageNum === null || tonnageNum < 0)) {
      next.tonnage = 'Tonaż nie może być ujemny.';
    }

    for (const p of priceList.parameters) {
      const raw = rawValues[p.key] ?? '';
      if (raw.trim() === '') continue;
      const v = parameterNumbers[p.key];
      if (v === null) {
        next[p.key] = 'Podaj poprawną liczbę.';
      } else if (v < 0) {
        next[p.key] = 'Wartość nie może być ujemna.';
      } else if (v > 100) {
        next[p.key] = 'Wartość nie może przekraczać 100.';
      }
    }

    return next;
  }, [basePriceNum, rawBasePrice, rawTonnage, tonnageNum, priceList.parameters, rawValues, parameterNumbers]);

  const hardReqFailures = useMemo(() => {
    return rzepakKomagraHardRequirements
      .map((req) => {
        const raw = hardReqValues[req.key] ?? '';
        if (raw.trim() === '') return null;
        const v = parseDecimal(raw);
        if (v === null || v < 0) return { req, error: 'Podaj poprawną nieujemną liczbę.' };
        if (v > req.max) return { req, error: `Przekroczono limit ${req.max}${req.unit}.` };
        return null;
      })
      .filter(Boolean) as { req: (typeof rzepakKomagraHardRequirements)[number]; error: string }[];
  }, [hardReqValues]);

  function handleCalculate() {
    setTouched({ basePrice: true, tonnage: true });
    setTouched((prev) => {
      const next = { ...prev };
      for (const p of priceList.parameters) next[p.key] = true;
      for (const req of rzepakKomagraHardRequirements) next[req.key] = true;
      return next;
    });

    setCalcError(null);

    if (basePriceNum === null || basePriceNum <= 0) {
      setCalcError('Podaj poprawną dodatnią cenę bazową.');
      setResult(null);
      return;
    }
    if (tonnageNum === null || tonnageNum < 0) {
      setCalcError('Podaj poprawny nieujemny tonaż.');
      setResult(null);
      return;
    }

    const invalidParam = priceList.parameters.find((p) => {
      const v = parameterNumbers[p.key];
      return v === null || v < 0 || v > 100;
    });
    if (invalidParam) {
      setCalcError(`Popraw wartość parametru: ${invalidParam.label}.`);
      setResult(null);
      return;
    }

    if (hardReqFailures.length > 0) {
      setCalcError('Dostawa nie spełnia wymagań Komagry — sprawdź checklistę poniżej.');
      setResult(null);
      return;
    }

    try {
      const inputs = priceList.parameters.map((p) => ({
        key: p.key,
        value: parameterNumbers[p.key] ?? p.basePoint,
      }));
      setResult(calculatePrice(priceList, basePriceNum, inputs, tonnageNum));
    } catch (e) {
      setResult(null);
      setCalcError((e as Error).message);
    }
  }

  function handleReset() {
    setRawBasePrice('2380');
    setRawTonnage('1');
    setRawValues({});
    setHardReqValues({});
    setTouched({});
    setResult(null);
    setCalcError(null);
  }

  const hasErrors =
    Object.keys(errors).length > 0 ||
    hardReqFailures.length > 0 ||
    basePriceNum === null ||
    tonnageNum === null;

  return (
    <main style={{ maxWidth: 560, margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1>Kalkulator skupu zbóż</h1>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Zboże / skupujący
        <select
          style={{ display: 'block', width: '100%', marginTop: 4, padding: 6 }}
          value={priceList.grain}
          onChange={(e) => {
            const next = AVAILABLE_PRICE_LISTS.find((p) => p.grain === e.target.value);
            if (next) {
              setPriceList(next);
              setRawValues({});
              setHardReqValues({});
              setResult(null);
              setCalcError(null);
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

      <NumberField
        label="Cena bazowa netto (zł/t)"
        value={rawBasePrice}
        error={touched.basePrice ? errors.basePrice : undefined}
        onChange={(v) => {
          setRawBasePrice(v);
          setTouched((prev) => ({ ...prev, basePrice: true }));
        }}
      />

      <NumberField
        label="Tonaż (t)"
        value={rawTonnage}
        error={touched.tonnage ? errors.tonnage : undefined}
        onChange={(v) => {
          setRawTonnage(v);
          setTouched((prev) => ({ ...prev, tonnage: true }));
        }}
      />

      <h2 style={{ fontSize: '1.1rem', marginTop: 24 }}>Parametry jakości</h2>
      {priceList.parameters.map((p) => (
        <NumberField
          key={p.key}
          label={`${p.label} (${p.unit})`}
          placeholder={String(p.basePoint)}
          value={rawValues[p.key] ?? ''}
          error={touched[p.key] ? errors[p.key] : undefined}
          onChange={(v) => {
            setRawValues((prev) => ({ ...prev, [p.key]: v }));
            setTouched((prev) => ({ ...prev, [p.key]: true }));
          }}
        />
      ))}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: '1.1rem' }}>Wymagania jakościowe Komagry (tak/nie)</h2>
        <p style={{ fontSize: '0.85rem', color: '#555', marginTop: -8 }}>
          Przekroczenie limitu = brak przyjęcia dostawy. Wpisz zmierzoną wartość lub zostaw puste,
          jeśli nie badano.
        </p>
        {rzepakKomagraHardRequirements.map((req) => {
          const failure = hardReqFailures.find((f) => f.req.key === req.key);
          return (
            <NumberField
              key={req.key}
              label={`${req.label} — max ${req.max}${req.unit}`}
              value={hardReqValues[req.key] ?? ''}
              error={touched[req.key] ? failure?.error : undefined}
              onChange={(v) => {
                setHardReqValues((prev) => ({ ...prev, [req.key]: v }));
                setTouched((prev) => ({ ...prev, [req.key]: true }));
              }}
            />
          );
        })}
      </section>

      <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
        <button onClick={handleCalculate} disabled={hasErrors}>
          Oblicz cenę
        </button>
        <button type="button" onClick={handleReset} style={{ background: 'transparent' }}>
          Wyczyść
        </button>
      </div>

      {calcError && <p style={{ color: 'crimson', marginTop: 16 }}>{calcError}</p>}

      {result && (
        <section style={{ marginTop: 24, padding: 16, background: '#f6f6f6', borderRadius: 8 }}>
          {result.rejected ? (
            <p style={{ color: 'crimson' }}>
              <strong>Brak przyjęcia dostawy:</strong> {result.rejectReason}
            </p>
          ) : (
            <>
              <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Wynik</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0' }}>Cena bazowa</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(result.basePrice)} zł/t</td>
                  </tr>
                  {result.parameterResults.map((r) => (
                    <tr key={r.key}>
                      <td style={{ padding: '4px 0' }}>
                        {r.label}: {r.value}{r.type === 'base' ? ' (baza)' : ''}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: r.amountPerTonne > 0 ? 'green' : r.amountPerTonne < 0 ? 'crimson' : 'inherit',
                          fontWeight: 600,
                        }}
                      >
                        {r.amountPerTonne > 0 ? '+' : ''}
                        {formatNumber(r.amountPerTonne)} zł/t
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #ccc' }}>
                    <td style={{ padding: '8px 0', fontWeight: 700 }}>Cena końcowa</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(result.finalPricePerTonne)} zł/t</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0' }}>Wartość dostawy ({result.tonnage} t)</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatNumber(result.totalValue)} zł</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </section>
      )}
    </main>
  );
}

interface NumberFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}

function NumberField({ label, value, placeholder, error, onChange }: NumberFieldProps) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      {label}
      <input
        style={{
          display: 'block',
          width: '100%',
          marginTop: 4,
          padding: 6,
          border: error ? '2px solid crimson' : '1px solid #ccc',
          borderRadius: 4,
        }}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <span style={{ color: 'crimson', fontSize: '0.8rem' }}>{error}</span>}
    </label>
  );
}
