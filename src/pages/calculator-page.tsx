import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { calculatePrice } from '@/pricingEngine';
import { rzepakKomagra, rzepakKomagraHardRequirements } from '@/data/rzepak-komagra';
import type { GrainPriceList, PriceCalculationResult } from '@/types';
import { parseDecimal, cn, formatNumber } from '@/lib/utils';
import { getTransportById } from '@/lib/storage';
import type { SavedTransport } from '@/types/transport';

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
import {
  TrailerForm,
  TrailerFormState,
  createEmptyTrailer,
  validateTrailer,
} from '@/components/trailer-form';
import { SaveTransportDialog } from '@/components/save-transport-dialog';

const AVAILABLE_PRICE_LISTS: GrainPriceList[] = [rzepakKomagra];

/**
 * Wrapper czytający `?edit=<id>`. Formularz dostaje transport propsem i jest
 * kluczowany po `editId`, więc wejście i wyjście z trybu edycji przemontowuje
 * go ze świeżym stanem. Dzięki temu inicjalizacja siedzi w useState zamiast
 * w efekcie przepisującym pięć setterów po zamontowaniu.
 */
export default function CalculatorPage() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const existingTransport = (editId ? getTransportById(editId) : undefined) ?? null;

  return <CalculatorForm key={editId ?? 'nowy'} existingTransport={existingTransport} />;
}

/**
 * Starsze zapisy miały dane rozbite na przyczepy (z osobnymi tonażami). Dziś
 * dostawa to jedna waga i jedna wspólna próbka — przy edycji starego zapisu
 * sumujemy tonaże i bierzemy pomiary z pierwszej przyczepy.
 */
function initDelivery(existingTransport: SavedTransport | null): TrailerFormState {
  if (!existingTransport) return createEmptyTrailer();

  const first = existingTransport.trailers[0];
  const tonnage =
    existingTransport.trailers.length > 1
      ? String(
          existingTransport.trailers.reduce((sum, t) => sum + (parseDecimal(t.tonnage) ?? 0), 0)
        )
      : (first?.tonnage ?? '1');

  return {
    tonnage,
    values: first?.values ?? {},
    hardReqValues: first?.hardReqValues ?? {},
    hasLabResults: first?.hasLabResults ?? false,
    touched: {},
  };
}

function CalculatorForm({ existingTransport }: { existingTransport: SavedTransport | null }) {
  const navigate = useNavigate();

  const [priceList, setPriceList] = useState<GrainPriceList>(
    () =>
      AVAILABLE_PRICE_LISTS.find((p) => p.grain === existingTransport?.grain) ??
      AVAILABLE_PRICE_LISTS[0]
  );
  const [rawBasePrice, setRawBasePrice] = useState<string>(() =>
    existingTransport ? String(existingTransport.basePrice) : '2380'
  );
  const [trailer, setTrailer] = useState<TrailerFormState>(() => initDelivery(existingTransport));
  const [results, setResults] = useState<PriceCalculationResult[] | null>(
    existingTransport?.results ?? null
  );
  const [calcError, setCalcError] = useState<string | null>(null);

  const basePriceNum = parseDecimal(rawBasePrice);

  const trailerValidation = useMemo(() => {
    return validateTrailer(priceList, trailer);
  }, [trailer, priceList]);

  function handleCalculate() {
    setCalcError(null);

    setTrailer((prev) => {
      const nextTouched: Record<string, boolean> = { ...prev.touched, tonnage: true };
      for (const p of priceList.parameters) nextTouched[p.key] = true;
      if (prev.hasLabResults) {
        for (const req of rzepakKomagraHardRequirements) nextTouched[req.key] = true;
      }
      return { ...prev, touched: nextTouched };
    });

    if (basePriceNum === null || basePriceNum <= 0) {
      setCalcError('Podaj poprawną dodatnią cenę bazową.');
      setResults(null);
      return;
    }

    if (trailerValidation.hasErrors) {
      setCalcError('Popraw dane transportu.');
      setResults(null);
      return;
    }

    try {
      const inputs = priceList.parameters.map((p) => ({
        key: p.key,
        value: trailerValidation.parameterNumbers[p.key] ?? p.basePoint,
      }));
      setResults([calculatePrice(priceList, basePriceNum, inputs, trailerValidation.tonnageNum ?? 0)]);
    } catch (e) {
      setResults(null);
      setCalcError((e as Error).message);
    }
  }

  function handleReset() {
    if (existingTransport) {
      // Wyjście z trybu edycji zmienia editId, więc wrapper przemontuje
      // formularz z domyślnymi wartościami — nie ma co czyścić ręcznie.
      // navigate() zwraca Promise od react-router 7; nie ma na co czekać.
      void navigate('/', { replace: true });
      return;
    }

    setRawBasePrice('2380');
    setTrailer(createEmptyTrailer());
    setResults(null);
    setCalcError(null);
  }

  const totalValue = results?.reduce((sum, r) => sum + r.totalValue, 0) ?? 0;
  // Wynik aktualny tylko gdy jest dokładnie jeden — starsze zapisy zestawu
  // mają dwa wyniki (przyczepy liczone osobno) i wymagają przeliczenia.
  const currentResult = results?.length === 1 ? results[0] : null;

  const canSave = basePriceNum !== null && basePriceNum > 0;

  return (
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
                  setTrailer(createEmptyTrailer());
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
        </CardContent>
      </Card>

      <TrailerForm priceList={priceList} data={trailer} onChange={(patch) => setTrailer((prev) => ({ ...prev, ...patch }))} />

      <div className="space-y-3 pt-1">
        <Button
          onClick={handleCalculate}
          disabled={basePriceNum === null || basePriceNum <= 0}
          className="h-12 w-full text-base"
        >
          Oblicz cenę
        </Button>

        <SaveTransportDialog
          priceList={priceList}
          basePrice={basePriceNum ?? 0}
          trailerCount={1}
          trailers={[trailer]}
          results={results}
          totalValue={totalValue}
          existingTransport={existingTransport ?? undefined}
        >
          <Button
            type="button"
            variant={existingTransport ? 'default' : 'secondary'}
            disabled={!canSave}
            className="h-12 w-full text-base"
          >
            {existingTransport ? 'Zapisz zmiany' : 'Zapisz transport'}
          </Button>
        </SaveTransportDialog>

        {existingTransport && (
          <Button
            asChild
            variant="outline"
            className="h-12 w-full text-base"
          >
            <Link to={`/transporty/${existingTransport.grain}`}>Anuluj edycję</Link>
          </Button>
        )}

        {calcError && (
          <p className="text-center text-sm font-medium text-destructive">{calcError}</p>
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
            {!currentResult ? (
              <p className="text-sm text-muted-foreground">
                Zapisany wynik pochodzi z poprzedniej wersji (przyczepy liczone osobno). Kliknij
                „Oblicz cenę", aby przeliczyć dostawę.
              </p>
            ) : currentResult.rejected ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm font-semibold text-destructive">Brak przyjęcia</p>
                <p className="text-sm text-destructive/90">{currentResult.rejectReason}</p>
              </div>
            ) : (
              <>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Dostawa ({formatNumber(currentResult.tonnage)} t)
                  </p>
                  <p className="text-4xl font-bold text-primary sm:text-5xl">
                    {formatNumber(currentResult.finalPricePerTonne)} zł/t
                  </p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Wartość: {formatNumber(currentResult.totalValue)} zł
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border bg-card p-4">
                  <ResultRow
                    label="Cena bazowa"
                    value={`${formatNumber(currentResult.basePrice)} zł/t`}
                  />
                  {currentResult.parameterResults.map((r) => (
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
                  <p className="text-sm text-primary-foreground/90">Wartość dostawy</p>
                  <p className="text-2xl font-bold sm:text-3xl">{formatNumber(totalValue)} zł</p>
                </div>
              </>
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
