import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Trash2, Calculator } from 'lucide-react';
import { getTransports, deleteTransport } from '@/lib/storage';
import { formatNumber } from '@/lib/utils';
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

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
}

export default function TransportsPage() {
  const [transports, setTransports] = useState<SavedTransport[]>(() => getTransports());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summary = useMemo(() => {
    const count = transports.length;
    const totalValue = transports.reduce((sum, t) => sum + (t.totalValue || 0), 0);
    return { count, totalValue };
  }, [transports]);

  function handleDelete(id: string) {
    deleteTransport(id);
    setTransports(getTransports());
  }

  if (transports.length === 0) {
    return (
      <main className="mx-auto max-w-xl p-4 sm:p-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Brak zapisanych transportów</CardTitle>
            <CardDescription>
              Wróć do kalkulatora i zapisz pierwszy transport.
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
      <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/40">
        <CardHeader>
          <CardTitle>Podsumowanie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Liczba transportów</span>
            <span className="font-semibold">{summary.count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Suma wartości</span>
            <span className="text-lg font-bold text-primary">
              {formatNumber(summary.totalValue)} zł
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {transports.map((transport) => {
          const isExpanded = expandedId === transport.id;
          return (
            <Card key={transport.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{transport.name}</CardTitle>
                    <CardDescription>
                      {formatDate(transport.date)} · {transport.grain} ({transport.buyer}) ·{' '}
                      {transport.trailerCount} {transport.trailerCount === 1 ? 'przyczepa' : 'przyczepy'}
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
