import { Link } from 'react-router-dom';
import { Wheat, Calculator } from 'lucide-react';
import { getTransports } from '@/lib/storage';
import { formatNumber } from '@/lib/utils';
import { GRAINS } from '@/data/grains';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function TransportsIndexPage() {
  const transports = getTransports();

  const grainStats = GRAINS.map((grain) => {
    const grainTransports = transports.filter((t) => t.grain === grain.key);
    const count = grainTransports.length;
    const value = grainTransports.reduce((sum, t) => sum + (t.totalValue || 0), 0);
    return { ...grain, count, value };
  });

  const totalCount = transports.length;
  const totalValue = transports.reduce((sum, t) => sum + (t.totalValue || 0), 0);

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 pb-10 sm:space-y-6 sm:p-6 sm:pb-12">
      <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/40">
        <CardHeader>
          <CardTitle>Moje transporty</CardTitle>
          <CardDescription>
            {totalCount === 0
              ? 'Nie masz jeszcze zapisanych transportów.'
              : `Łącznie ${totalCount} ${totalCount === 1 ? 'transport' : 'transporty'} o wartości ${formatNumber(totalValue)} zł`}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {grainStats.map((grain) => (
          <Link
            key={grain.key}
            to={`/transporty/${grain.key}`}
            className="group block"
          >
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-secondary/40">
              <CardContent className="flex h-full flex-col items-center justify-center p-4 text-center">
                <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <Wheat className="size-6" />
                </div>
                <h3 className="font-semibold">{grain.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {grain.count} {grain.count === 1 ? 'transport' : 'transporty'}
                </p>
                <p className="text-sm font-bold text-primary">
                  {formatNumber(grain.value)} zł
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Button asChild variant="outline" className="w-full">
        <Link to="/">
          <Calculator className="mr-2 size-4" /> Wróć do kalkulatora
        </Link>
      </Button>
    </main>
  );
}
