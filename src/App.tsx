import { useMemo, useState } from 'react';
import { calculatePrice } from '@/pricingEngine';
import { rzepakKomagra, rzepakKomagraHardRequirements } from '@/data/rzepak-komagra';
import type { GrainPriceList, PriceCalculationResult } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

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
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight">Kalkulator skupu zbóż</h1>

      <Card>
        <CardHeader>
          <CardTitle>Dane wejściowe</CardTitle>
          <CardDescription>{priceList.reference}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="priceList">Zboże / skupujący</Label>
            <Select
              value={priceList.grain}
              onValueChange={(value) => {
                const next = AVAILABLE_PRICE_LISTS.find((p) => p.grain === value);
                if (next) {
                  setPriceList(next);
                  setRawValues({});
                  setHardReqValues({});
                  setResult(null);
                  setCalcError(null);
                }
              }}
            >
              <SelectTrigger id="priceList">
                <SelectValue placeholder="Wybierz cennik" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_PRICE_LISTS.map((p) => (
                  <SelectItem key={p.grain} value={p.grain}>
                    {p.grain} ({p.buyer})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <NumberField
            id="basePrice"
            label="Cena bazowa netto (zł/t)"
            value={rawBasePrice}
            error={touched.basePrice ? errors.basePrice : undefined}
            onChange={(v) => {
              setRawBasePrice(v);
              setTouched((prev) => ({ ...prev, basePrice: true }));
            }}
          />

          <NumberField
            id="tonnage"
            label="Tonaż (t)"
            value={rawTonnage}
            error={touched.tonnage ? errors.tonnage : undefined}
            onChange={(v) => {
              setRawTonnage(v);
              setTouched((prev) => ({ ...prev, tonnage: true }));
            }}
          />

          <div className="pt-2">
            <h2 className="text-lg font-semibold">Parametry jakości</h2>
          </div>

          {priceList.parameters.map((p) => (
            <NumberField
              key={p.key}
              id={p.key}
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

          <div className="pt-2">
            <h2 className="text-lg font-semibold">Wymagania jakościowe Komagry</h2>
            <p className="text-sm text-muted-foreground">
              Przekroczenie limitu = brak przyjęcia dostawy. Wpisz zmierzoną wartość lub zostaw puste,
              jeśli nie badano.
            </p>
          </div>

          {rzepakKomagraHardRequirements.map((req) => {
            const failure = hardReqFailures.find((f) => f.req.key === req.key);
            return (
              <NumberField
                key={req.key}
                id={req.key}
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

          <div className="flex gap-3 pt-2">
            <Button onClick={handleCalculate} disabled={hasErrors}>
              Oblicz cenę
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Wyczyść
            </Button>
          </div>

          {calcError && (
            <p className="text-sm font-medium text-destructive">{calcError}</p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Wynik</CardTitle>
          </CardHeader>
          <CardContent>
            {result.rejected ? (
              <p className="font-medium text-destructive">
                Brak przyjęcia dostawy: {result.rejectReason}
              </p>
            ) : (
              <div className="space-y-2">
                <ResultRow label="Cena bazowa" value={`${formatNumber(result.basePrice)} zł/t`} />
                {result.parameterResults.map((r) => (
                  <ResultRow
                    key={r.key}
                    label={`${r.label}: ${r.value}${r.type === 'base' ? ' (baza)' : ''}`}
                    value={`${r.amountPerTonne > 0 ? '+' : ''}${formatNumber(r.amountPerTonne)} zł/t`}
                    valueClassName={
                      r.amountPerTonne > 0
                        ? 'text-green-600'
                        : r.amountPerTonne < 0
                          ? 'text-destructive'
                          : undefined
                    }
                  />
                ))}
                <div className="border-t pt-2">
                  <ResultRow
                    label="Cena końcowa"
                    value={`${formatNumber(result.finalPricePerTonne)} zł/t`}
                    className="font-bold"
                    valueClassName="font-bold"
                  />
                  <ResultRow
                    label={`Wartość dostawy (${result.tonnage} t)`}
                    value={`${formatNumber(result.totalValue)} zł`}
                    className="font-bold"
                    valueClassName="font-bold"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}

function NumberField({ id, label, value, placeholder, error, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface ResultRowProps {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}

function ResultRow({ label, value, className, valueClassName }: ResultRowProps) {
  return (
    <div className={`flex items-center justify-between ${className ?? ''}`}>
      <span>{label}</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}
