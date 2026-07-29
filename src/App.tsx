import { useMemo, useState } from 'react';
import { Wheat } from 'lucide-react';
import { calculatePrice } from '@/pricingEngine';
import { rzepakKomagra, rzepakKomagraHardRequirements } from '@/data/rzepak-komagra';
import type { GrainPriceList, PriceCalculationResult } from '@/types';
import { parseDecimal, cn } from '@/lib/utils';

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
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ModeToggle } from '@/components/mode-toggle';
import {
  TrailerForm,
  TrailerFormState,
  createEmptyTrailer,
  validateTrailer,
} from '@/components/trailer-form';

const AVAILABLE_PRICE_LISTS: GrainPriceList[] = [rzepakKomagra];

function formatNumber(n: number): string {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function App() {
  const [priceList, setPriceList] = useState<GrainPriceList>(AVAILABLE_PRICE_LISTS[0]);
  const [rawBasePrice, setRawBasePrice] = useState<string>('2380');
  const [trailerCount, setTrailerCount] = useState<1 | 2>(1);
  const [trailers, setTrailers] = useState<TrailerFormState[]>([createEmptyTrailer()]);
  const [results, setResults] = useState<PriceCalculationResult[] | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  const basePriceNum = parseDecimal(rawBasePrice);

  const trailerValidations = useMemo(() => {
    return trailers.map((t) => validateTrailer(priceList, t));
  }, [trailers, priceList]);

  function updateTrailer(index: number, patch: Partial<TrailerFormState>) {
    setTrailers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function handleTrailerCountChange(count: 1 | 2) {
    setTrailerCount(count);
    setTrailers((prev) => {
      if (count === 1) return [prev[0] ?? createEmptyTrailer()];
      const first = prev[0] ?? createEmptyTrailer();
      const second = prev[1] ?? createEmptyTrailer();
      return [first, second];
    });
    setResults(null);
    setCalcError(null);
  }

  function handleCalculate() {
    setCalcError(null);

    // Mark everything as touched
    setTrailers((prev) =>
      prev.map((t) => {
        const nextTouched: Record<string, boolean> = { ...t.touched, tonnage: true };
        for (const p of priceList.parameters) nextTouched[p.key] = true;
        if (t.hasLabResults) {
          for (const req of rzepakKomagraHardRequirements) nextTouched[req.key] = true;
        }
        return { ...t, touched: nextTouched };
      })
    );

    if (basePriceNum === null || basePriceNum <= 0) {
      setCalcError('Podaj poprawną dodatnią cenę bazową.');
      setResults(null);
      return;
    }

    const invalidTrailerIndex = trailerValidations.findIndex((v) => v.hasErrors);
    if (invalidTrailerIndex !== -1) {
      setCalcError(`Popraw dane w przyczepie nr ${invalidTrailerIndex + 1}.`);
      setResults(null);
      return;
    }

    try {
      const nextResults = trailers.map((t) => {
        const validation = validateTrailer(priceList, t);
        const inputs = priceList.parameters.map((p) => ({
          key: p.key,
          value: validation.parameterNumbers[p.key] ?? p.basePoint,
        }));
        return calculatePrice(priceList, basePriceNum, inputs, validation.tonnageNum ?? 0);
      });
      setResults(nextResults);
    } catch (e) {
      setResults(null);
      setCalcError((e as Error).message);
    }
  }

  function handleReset() {
    setRawBasePrice('2380');
    setTrailerCount(1);
    setTrailers([createEmptyTrailer()]);
    setResults(null);
    setCalcError(null);
  }

  const totalValue = results?.reduce((sum, r) => sum + r.totalValue, 0) ?? 0;
  const anyRejected = results?.some((r) => r.rejected) ?? false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Wheat className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Kłosek</h1>
              <p className="text-xs text-muted-foreground">Kalkulator cen skupu zbóż</p>
            </div>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4 pb-10 sm:space-y-6 sm:p-6 sm:pb-12">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Dane transportu</CardTitle>
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
                    setTrailers((prev) => prev.map(() => createEmptyTrailer()));
                    setResults(null);
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
              error={
                rawBasePrice.trim() !== '' && (basePriceNum === null || basePriceNum <= 0)
                  ? 'Podaj dodatnią cenę bazową.'
                  : undefined
              }
              onChange={(v) => setRawBasePrice(v)}
            />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Liczba przyczep</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={trailerCount === 1 ? 'default' : 'outline'}
                  className="h-12 text-base"
                  onClick={() => handleTrailerCountChange(1)}
                >
                  Jedna przyczepa
                </Button>
                <Button
                  type="button"
                  variant={trailerCount === 2 ? 'default' : 'outline'}
                  className="h-12 text-base"
                  onClick={() => handleTrailerCountChange(2)}
                >
                  Dwie przyczepy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {trailers.slice(0, trailerCount).map((trailer, index) => (
            <TrailerForm
              key={index}
              index={index + 1}
              priceList={priceList}
              data={trailer}
              onChange={(patch) => updateTrailer(index, patch)}
            />
          ))}
        </div>

        <div className="pt-1">
          <Button
            onClick={handleCalculate}
            disabled={basePriceNum === null || basePriceNum <= 0}
            className="h-12 w-full text-base"
          >
            Oblicz cenę
          </Button>
          {calcError && (
            <p className="mt-3 text-center text-sm font-medium text-destructive">
              {calcError}
            </p>
          )}
        </div>

        {results && (
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
              {anyRejected ? (
                <div className="space-y-3">
                  {results.map((result, idx) =>
                    result.rejected ? (
                      <div
                        key={idx}
                        className="rounded-lg border border-destructive/30 bg-destructive/10 p-3"
                      >
                        <p className="text-sm font-semibold text-destructive">
                          Przyczepa nr {idx + 1}: brak przyjęcia
                        </p>
                        <p className="text-sm text-destructive/90">{result.rejectReason}</p>
                      </div>
                    ) : (
                      <div key={idx} className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">Przyczepa nr {idx + 1}</p>
                        <p className="text-lg font-semibold text-primary">
                          {formatNumber(result.finalPricePerTonne)} zł/t
                        </p>
                        <p className="text-sm">Wartość: {formatNumber(result.totalValue)} zł</p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <>
                  <div
                    className={cn(
                      'grid gap-3',
                      results.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
                    )}
                  >
                    {results.map((result, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'rounded-lg border bg-card p-3 text-center',
                          results.length === 1 && 'p-4'
                        )}
                      >
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          Przyczepa nr {idx + 1} ({trailers[idx].tonnage} t)
                        </p>
                        <p
                          className={cn(
                            'font-bold text-primary',
                            results.length === 1 ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'
                          )}
                        >
                          {formatNumber(result.finalPricePerTonne)} zł/t
                        </p>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          Wartość: {formatNumber(result.totalValue)} zł
                        </p>
                      </div>
                    ))}
                  </div>

                  {results.length === 1 && (
                    <div className="space-y-2 rounded-lg border bg-card p-4">
                      <ResultRow
                        label="Cena bazowa"
                        value={`${formatNumber(results[0].basePrice)} zł/t`}
                      />
                      {results[0].parameterResults.map((r) => (
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
                  )}

                  <div className="rounded-lg bg-primary p-4 text-center text-primary-foreground shadow-sm">
                    <p className="text-sm text-primary-foreground/90">
                      {results.length === 1 ? 'Wartość dostawy' : 'Suma wartości dostawy'}
                    </p>
                    <p className="text-2xl font-bold sm:text-3xl">
                      {formatNumber(totalValue)} zł
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
}

function NumberField({ id, label, value, placeholder, error, onChange }: NumberFieldProps) {
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
        className="h-12 text-base sm:h-10"
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
