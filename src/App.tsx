import { useMemo, useState } from 'react';
import { Wheat, FlaskConical } from 'lucide-react';
import { calculatePrice } from '@/pricingEngine';
import { rzepakKomagra, rzepakKomagraHardRequirements } from '@/data/rzepak-komagra';
import type { GrainPriceList, PriceCalculationResult } from '@/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ModeToggle } from '@/components/mode-toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
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
  const [hasLabResults, setHasLabResults] = useState(false);

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

    if (hasLabResults && hardReqFailures.length > 0) {
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
    setHasLabResults(false);
  }

  const hasErrors =
    Object.keys(errors).length > 0 ||
    (hasLabResults && hardReqFailures.length > 0) ||
    basePriceNum === null ||
    tonnageNum === null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Wheat className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">GrainTally</h1>
              <p className="text-xs text-muted-foreground">Kalkulator cen skupu zbóż</p>
            </div>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4 pb-10 sm:space-y-6 sm:p-6 sm:pb-12">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Dane wejściowe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="priceList" className="text-sm font-medium">
                Zboże / skupujący
              </Label>
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
                <SelectTrigger id="priceList" className="h-12 w-full sm:h-10">
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

            <div className="space-y-4 rounded-lg border bg-secondary/30 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Badanie laboratoryjne</h2>
                  <p className="text-sm text-muted-foreground">
                    Sprawdź czy dostawa zostanie przyjęta.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <FlaskConical className="size-4 text-muted-foreground" />
                  <Label htmlFor="labResults" className="text-sm font-normal">
                    Mam wyniki badań
                  </Label>
                  <Switch
                    id="labResults"
                    checked={hasLabResults}
                    onCheckedChange={(checked) => {
                      setHasLabResults(checked);
                      if (!checked) {
                        setHardReqValues({});
                        setTouched((prev) => {
                          const next = { ...prev };
                          for (const req of rzepakKomagraHardRequirements) {
                            delete next[req.key];
                          }
                          return next;
                        });
                      }
                    }}
                  />
                </div>
              </div>

              {hasLabResults && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Przekroczenie limitu = brak przyjęcia dostawy. Wpisz zmierzoną wartość lub zostaw
                    puste, jeśli nie badano.
                  </p>
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
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                onClick={handleCalculate}
                disabled={hasErrors}
                className="h-12 w-full text-base"
              >
                Oblicz cenę
              </Button>
            </div>

            {calcError && (
              <p className="text-sm font-medium text-destructive">{calcError}</p>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/40">
            <CardHeader>
              <CardTitle>Wynik</CardTitle>
              <CardAction>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Wyczyść
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-5">
              {result.rejected ? (
                <p className="font-medium text-destructive">
                  Brak przyjęcia dostawy: {result.rejectReason}
                </p>
              ) : (
                <>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Cena końcowa</p>
                    <p className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
                      {formatNumber(result.finalPricePerTonne)} zł/t
                    </p>
                  </div>

                  <div className="space-y-2 rounded-lg border bg-card p-4">
                    <ResultRow
                      label="Cena bazowa"
                      value={`${formatNumber(result.basePrice)} zł/t`}
                    />
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
                  </div>

                  <div className="rounded-lg bg-primary p-4 text-center text-primary-foreground shadow-sm">
                    <p className="text-sm text-primary-foreground/90">Wartość dostawy ({result.tonnage} t)</p>
                    <p className="text-2xl font-bold sm:text-3xl">
                      {formatNumber(result.totalValue)} zł
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
  inputClassName?: string;
}

function NumberField({ id, label, value, placeholder, error, onChange, inputClassName }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className={cn('h-12 text-base sm:h-10', inputClassName)}
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
    <div className={cn('flex items-center justify-between text-sm', className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold', valueClassName)}>{value}</span>
    </div>
  );
}
