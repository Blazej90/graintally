import { useState } from 'react';
import { saveTransport } from '@/lib/storage';
import type { SavedTransport, SavedTrailer } from '@/types/transport';
import type { PriceCalculationResult, GrainPriceList } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TrailerFormState } from '@/components/trailer-form';

interface SaveTransportDialogProps {
  priceList: GrainPriceList;
  basePrice: number;
  trailerCount: 1 | 2;
  trailers: TrailerFormState[];
  results?: PriceCalculationResult[] | null;
  totalValue: number;
  children: React.ReactNode;
}

function todayInputValue(): string {
  return new Date().toISOString().split('T')[0];
}

export function SaveTransportDialog({
  priceList,
  basePrice,
  trailerCount,
  trailers,
  results,
  totalValue,
  children,
}: SaveTransportDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayInputValue());
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function reset() {
    setName('');
    setDate(todayInputValue());
    setDescription('');
    setError(null);
    setSaved(false);
  }

  function handleSave() {
    if (!name.trim()) {
      setError('Podaj nazwę transportu lub numer kontraktu.');
      return;
    }
    if (!date) {
      setError('Wybierz datę transportu.');
      return;
    }

    const savedTrailers: SavedTrailer[] = trailers.slice(0, trailerCount).map((t) => ({
      tonnage: t.tonnage,
      values: t.values,
      hasLabResults: t.hasLabResults,
      hardReqValues: t.hardReqValues,
    }));

    const transport: SavedTransport = {
      id: crypto.randomUUID(),
      name: name.trim(),
      date,
      description: description.trim() || undefined,
      grain: priceList.grain,
      buyer: priceList.buyer,
      basePrice,
      trailerCount,
      trailers: savedTrailers,
      results: results ?? undefined,
      totalValue,
      createdAt: new Date().toISOString(),
    };

    saveTransport(transport);
    setSaved(true);
    setTimeout(() => {
      setOpen(false);
      reset();
    }, 800);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) reset();
      setOpen(next);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zapisz transport</DialogTitle>
          <DialogDescription>
            Zapisz dane transportu, żeby później wrócić do nich w „Moich transportach”.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="transport-name">Nazwa transportu / nr kontraktu</Label>
            <Input
              id="transport-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Np. Kontrakt 123/2026"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transport-date">Data transportu</Label>
            <Input
              id="transport-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transport-desc">Opis (opcjonalny)</Label>
            <Textarea
              id="transport-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatkowe informacje o transporcie..."
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm font-medium text-primary">Transport zapisany!</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>Zapisz transport</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
