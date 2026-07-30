import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Trash2, Calculator, ArrowLeft } from 'lucide-react';
import { getTransports, deleteTransport } from '@/lib/storage';
import { formatNumber, fuzzySearch } from '@/lib/utils';
import { GRAINS, getGrainLabel } from '@/data/grains';
import type { SavedTransport } from '@/types/transport';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  TransportFilters,
  DEFAULT_FILTERS,
  type TransportFiltersState,
} from '@/components/transport-filters';

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
}

function matchesDateFilter(transport: SavedTransport, filters: TransportFiltersState): boolean {
  if (filters.dateMode === 'any') return true;
  if (!transport.date) return false;

  const t = transport.date;

  if (filters.dateMode === 'day') {
    return t === filters.dateDay;
  }

  if (filters.dateMode === 'range') {
    if (filters.dateFrom && t < filters.dateFrom) return false;
    if (filters.dateTo && t > filters.dateTo) return false;
    return true;
  }

  if (filters.dateMode === 'month') {
    const [year, month] = t.split('-');
    const monthMatch = !filters.dateMonth || month === filters.dateMonth;
    const yearMatch = !filters.dateYear || year === filters.dateYear;
    return monthMatch && yearMatch;
  }

  return true;
}

export default function TransportsPage() {
  const { grain } = useParams<{ grain: string }>();
  const grainLabel = getGrainLabel(grain ?? '');
  const isValidGrain = GRAINS.some((g) => g.key === grain);

  const [transports, setTransports] = useState<SavedTransport[]>(() => getTransports());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransportFiltersState>(DEFAULT_FILTERS);

  const grainTransports = useMemo(
    () => transports.filter((t) => t.grain === grain),
    [transports, grain]
  );

  const filteredTransports = useMemo(() => {
    return grainTransports.filter((t) => {
      if (filters.query && !fuzzySearch(filters.query, t.name)) return false;
      if (!matchesDateFilter(t, filters)) return false;
      if (filters.buyer !== 'all' && t.buyer !== filters.buyer) return false;
      return true;
    });
  }, [grainTransports, filters]);

  const buyers = useMemo(() => {
    const set = new Set(grainTransports.map((t) => t.buyer));
    return Array.from(set).sort();
  }, [grainTransports]);

  const summary = useMemo(() => {
    const count = filteredTransports.length;
    const totalValue = filteredTransports.reduce((sum, t) => sum + (t.totalValue || 0), 0);
    return { count, totalValue };
  }, [filteredTransports]);

  function handleDelete(id: string) {
    deleteTransport(id);
    setTransports(getTransports());
  }

  if (!isValidGrain) {
    return (
      <main className="mx-auto max-w-xl p-4 sm:p-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Nieznane zboże</CardTitle>
            <CardDescription>Wybierz zboże z listy „Moje transporty".</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/transporty">Wróć do zbóż</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (grainTransports.length === 0) {
    return (
      <main className="mx-auto max-w-xl space-y-4 p-4 pb-10 sm:p-6">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
          <Link to="/transporty">
            <ArrowLeft className="mr-1 size-4" /> Wróć do zbóż
          </Link>
        </Button>

        <Card className="text-center">
          <CardHeader>
            <CardTitle>Brak transportów {grainLabel.toLowerCase()}</CardTitle>
            <CardDescription>
              Nie masz jeszcze zapisanych transportów tego zboża.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/">Przejdź do kalkulatora</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 pb-10 sm:space-y-6 sm:p-6 sm:pb-12">
      <Button variant="ghost" size="sm" asChild className="h-8 px-2">
        <Link to="/transporty">
          <ArrowLeft className="mr-1 size-4" /> Wróć do zbóż
        </Link>
      </Button>

      <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/40">
        <CardHeader>
          <CardTitle>Transporty: {grainLabel}</CardTitle>
          <CardDescription>
            {summary.count === 0
              ? 'Brak wyników dla wybranych filtrów.'
              : `${summary.count} ${summary.count === 1 ? 'transport' : 'transporty'} o wartości ${formatNumber(summary.totalValue)} zł`}
          </CardDescription>
        </CardHeader>
      </Card>

      <TransportFilters filters={filters} onChange={setFilters} buyers={buyers} />

      <div className="space-y-3">
        {filteredTransports.map((transport) => {
          const isExpanded = expandedId === transport.id;
          return (
            <Card key={transport.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{transport.name}</CardTitle>
                    <CardDescription>
                      {formatDate(transport.date)} · {transport.buyer} ·{' '}
                      {transport.trailerCount}{' '}
                      {transport.trailerCount === 1 ? 'przyczepa' : 'przyczepy'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {formatNumber(transport.totalValue)} zł
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transport.results ? 'z wynikiem' : 'bez wyniku'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setExpandedId(isExpanded ? null : transport.id)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="mr-1 size-3" /> Ukryj szczegóły
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 size-3" /> Pokaż szczegóły
                      </>
                    )}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-1 size-3" /> Usuń
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunąć transport?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tej operacji nie można cofnąć. Transport „{transport.name}” zostanie
                          trwale usunięty.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(transport.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Usuń
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {isExpanded && <TransportDetails transport={transport} />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link to="/">
          <Calculator className="mr-2 size-4" /> Wróć do kalkulatora
        </Link>
      </Button>
    </main>
  );
}

function TransportDetails({ transport }: { transport: SavedTransport }) {
  return (
    <div className="space-y-3 rounded-lg border bg-secondary/20 p-3 text-sm">
      <div className="space-y-1">
        <p>
          <span className="text-muted-foreground">Cena bazowa:</span>{' '}
          <span className="font-medium">{formatNumber(transport.basePrice)} zł/t</span>
        </p>
        {transport.description && (
          <p>
            <span className="text-muted-foreground">Opis:</span> {transport.description}
          </p>
        )}
      </div>

      {transport.trailers.map((trailer, idx) => (
        <div key={idx} className="space-y-1 border-t pt-2">
          <p className="font-semibold">Przyczepa nr {idx + 1}</p>
          <p>
            <span className="text-muted-foreground">Tonaż:</span>{' '}
            <span className="font-medium">{trailer.tonnage} t</span>
          </p>
          {Object.entries(trailer.values).length > 0 && (
            <div>
              <span className="text-muted-foreground">Parametry:</span>
              <ul className="ml-4 list-disc">
                {Object.entries(trailer.values).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {trailer.hasLabResults && Object.entries(trailer.hardReqValues).length > 0 && (
            <div>
              <span className="text-muted-foreground">Badanie laboratoryjne:</span>
              <ul className="ml-4 list-disc">
                {Object.entries(trailer.hardReqValues).map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {transport.results?.[idx] && (
            <p>
              <span className="text-muted-foreground">Wynik:</span>{' '}
              <span className="font-medium text-primary">
                {formatNumber(transport.results[idx].finalPricePerTonne)} zł/t
              </span>{' '}
              ({formatNumber(transport.results[idx].totalValue)} zł)
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
