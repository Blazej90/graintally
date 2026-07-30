import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker, DateRangePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DateFilterMode = 'any' | 'day' | 'range' | 'month';

export interface TransportFiltersState {
  query: string;
  dateMode: DateFilterMode;
  dateDay: string;
  dateFrom: string;
  dateTo: string;
  dateMonth: string;
  dateYear: string;
  buyer: string;
}

export const DEFAULT_FILTERS: TransportFiltersState = {
  query: '',
  dateMode: 'any',
  dateDay: '',
  dateFrom: '',
  dateTo: '',
  dateMonth: '',
  dateYear: '',
  buyer: 'all',
};

interface TransportFiltersProps {
  filters: TransportFiltersState;
  onChange: (filters: TransportFiltersState) => void;
  buyers: string[];
}

const MONTHS = [
  { value: '01', label: 'Styczeń' },
  { value: '02', label: 'Luty' },
  { value: '03', label: 'Marzec' },
  { value: '04', label: 'Kwiecień' },
  { value: '05', label: 'Maj' },
  { value: '06', label: 'Czerwiec' },
  { value: '07', label: 'Lipiec' },
  { value: '08', label: 'Sierpień' },
  { value: '09', label: 'Wrzesień' },
  { value: '10', label: 'Październik' },
  { value: '11', label: 'Listopad' },
  { value: '12', label: 'Grudzień' },
];

function generateYears(): string[] {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current + 1; y >= current - 5; y--) {
    years.push(String(y));
  }
  return years;
}

export function TransportFilters({ filters, onChange, buyers }: TransportFiltersProps) {
  const update = (patch: Partial<TransportFiltersState>) => {
    onChange({ ...filters, ...patch });
  };

  const hasFilters =
    filters.query ||
    filters.dateMode !== 'any' ||
    filters.buyer !== 'all';

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Szukaj po nazwie lub nr umowy..."
          value={filters.query}
          onChange={(e) => update({ query: e.target.value })}
          className="h-12 pl-9 text-base sm:h-10"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Data transportu</Label>
          <Select
            value={filters.dateMode}
            onValueChange={(value) =>
              update({ dateMode: value as DateFilterMode })
            }
          >
            <SelectTrigger className="h-12 w-full sm:h-10">
              <SelectValue placeholder="Wybierz tryb daty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Dowolna data</SelectItem>
              <SelectItem value="day">Konkretny dzień</SelectItem>
              <SelectItem value="range">Zakres dat</SelectItem>
              <SelectItem value="month">Miesiąc / rok</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Skupujący</Label>
          <Select
            value={filters.buyer}
            onValueChange={(value) => update({ buyer: value })}
          >
            <SelectTrigger className="h-12 w-full sm:h-10">
              <SelectValue placeholder="Wybierz skupującego" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszyscy</SelectItem>
              {buyers.map((buyer) => (
                <SelectItem key={buyer} value={buyer}>
                  {buyer}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filters.dateMode === 'day' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Wybierz dzień</Label>
          <DatePicker
            value={filters.dateDay}
            onChange={(value) => update({ dateDay: value })}
            className="h-12 sm:h-10"
          />
        </div>
      )}

      {filters.dateMode === 'range' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Wybierz zakres</Label>
          <DateRangePicker
            from={filters.dateFrom}
            to={filters.dateTo}
            onChange={(range) =>
              update({ dateFrom: range.from, dateTo: range.to })
            }
            className="h-12 sm:h-10"
          />
        </div>
      )}

      {filters.dateMode === 'month' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Miesiąc</Label>
            <Select
              value={filters.dateMonth}
              onValueChange={(value) => update({ dateMonth: value })}
            >
              <SelectTrigger className="h-12 w-full sm:h-10">
                <SelectValue placeholder="Wybierz miesiąc" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Rok</Label>
            <Select
              value={filters.dateYear}
              onValueChange={(value) => update({ dateYear: value })}
            >
              <SelectTrigger className="h-12 w-full sm:h-10">
                <SelectValue placeholder="Wybierz rok" />
              </SelectTrigger>
              <SelectContent>
                {generateYears().map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          <X className="mr-1 size-4" /> Wyczyść filtry
        </Button>
      )}
    </div>
  );
}
