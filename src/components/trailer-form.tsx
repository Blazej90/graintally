import { useMemo } from 'react';
import { FlaskConical } from 'lucide-react';
import { parseDecimal } from '@/lib/utils';
import { rzepakKomagraHardRequirements } from '@/data/rzepak-komagra';
import type { GrainPriceList } from '@/types';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface TrailerFormState {
  tonnage: string;
  values: Record<string, string>;
  hardReqValues: Record<string, string>;
  touched: Record<string, boolean>;
  hasLabResults: boolean;
}

export function createEmptyTrailer(): TrailerFormState {
  return {
    tonnage: '1',
    values: {},
    hardReqValues: {},
    touched: {},
    hasLabResults: false,
  };
}

export function validateTrailer(priceList: GrainPriceList, data: TrailerFormState) {
  const tonnageNum = parseDecimal(data.tonnage);

  const parameterNumbers: Record<string, number | null> = {};
  for (const p of priceList.parameters) {
    parameterNumbers[p.key] = parseDecimal(data.values[p.key] ?? '');
  }

  const errors: Record<string, string> = {};
  if (data.tonnage.trim() !== '' && (tonnageNum === null || tonnageNum < 0)) {
    errors.tonnage = 'Tonaż nie może być ujemny.';
  }
  for (const p of priceList.parameters) {
    const raw = data.values[p.key] ?? '';
    if (raw.trim() === '') continue;
    const v = parameterNumbers[p.key];
    if (v === null) {
      errors[p.key] = 'Podaj poprawną liczbę.';
    } else if (v < 0) {
      errors[p.key] = 'Wartość nie może być ujemna.';
    } else if (v > 100) {
      errors[p.key] = 'Wartość nie może przekraczać 100.';
    }
  }

  const hardReqFailures = rzepakKomagraHardRequirements
    .map((req) => {
      const raw = data.hardReqValues[req.key] ?? '';
      if (raw.trim() === '') return null;
      const v = parseDecimal(raw);
      if (v === null || v < 0) return { req, error: 'Podaj poprawną nieujemną liczbę.' };
      if (v > req.max) return { req, error: `Przekroczono limit ${req.max}${req.unit}.` };
      return null;
    })
    .filter(Boolean) as { req: (typeof rzepakKomagraHardRequirements)[number]; error: string }[];

  const hasErrors =
    Object.keys(errors).length > 0 ||
    (data.hasLabResults && hardReqFailures.length > 0) ||
    tonnageNum === null;

  return { tonnageNum, parameterNumbers, errors, hardReqFailures, hasErrors };
}

interface TrailerFormProps {
  index: number;
  priceList: GrainPriceList;
  data: TrailerFormState;
  onChange: (patch: Partial<TrailerFormState>) => void;
}

export function TrailerForm({ index, priceList, data, onChange }: TrailerFormProps) {
  const { errors, hardReqFailures } = useMemo(
    () => validateTrailer(priceList, data),
    [priceList, data]
  );

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-base font-semibold text-primary">Przyczepa nr {index}</h3>

      <NumberField
        id={`trailer-${index}-tonnage`}
        label="Tonaż (t)"
        value={data.tonnage}
        error={data.touched.tonnage ? errors.tonnage : undefined}
        onChange={(v) =>
          onChange({ tonnage: v, touched: { ...data.touched, tonnage: true } })
        }
      />

      <div className="pt-1">
        <h4 className="text-sm font-semibold text-muted-foreground">Parametry jakości</h4>
      </div>

      {priceList.parameters.map((p) => (
        <NumberField
          key={p.key}
          id={`trailer-${index}-${p.key}`}
          label={`${p.label} (${p.unit})`}
          placeholder={String(p.basePoint)}
          value={data.values[p.key] ?? ''}
          error={data.touched[p.key] ? errors[p.key] : undefined}
          onChange={(v) =>
            onChange({
              values: { ...data.values, [p.key]: v },
              touched: { ...data.touched, [p.key]: true },
            })
          }
        />
      ))}

      <div className="space-y-4 rounded-lg border bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold">Badanie laboratoryjne</h4>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Sprawdź czy dostawa zostanie przyjęta.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FlaskConical className="size-4 text-muted-foreground" />
            <Label
              htmlFor={`labResults-${index}`}
              className="text-xs font-normal whitespace-nowrap sm:text-sm"
            >
              Mam wyniki
            </Label>
            <Switch
              id={`labResults-${index}`}
              checked={data.hasLabResults}
              onCheckedChange={(checked) => {
                const patch: Partial<TrailerFormState> = { hasLabResults: checked };
                if (!checked) {
                  patch.hardReqValues = {};
                  const nextTouched = { ...data.touched };
                  for (const req of rzepakKomagraHardRequirements) {
                    delete nextTouched[req.key];
                  }
                  patch.touched = nextTouched;
                }
                onChange(patch);
              }}
            />
          </div>
        </div>

        {data.hasLabResults && (
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
                  id={`trailer-${index}-${req.key}`}
                  label={req.label}
                  helperText={`max ${req.max}${req.unit}`}
                  value={data.hardReqValues[req.key] ?? ''}
                  error={data.touched[req.key] ? failure?.error : undefined}
                  onChange={(v) =>
                    onChange({
                      hardReqValues: { ...data.hardReqValues, [req.key]: v },
                      touched: { ...data.touched, [req.key]: true },
                    })
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  onChange: (value: string) => void;
}

function NumberField({ id, label, value, placeholder, helperText, error, onChange }: NumberFieldProps) {
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
      {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
