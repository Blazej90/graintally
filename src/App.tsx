import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout';

// Trasy ładowane leniwie — kalkulator to zdecydowanie najcięższa strona
// (silnik + formularze przyczep), a wchodzący na "Moje transporty" nie musi
// jej pobierać.
const CalculatorPage = lazy(() => import('@/pages/calculator-page'));
const TransportsIndexPage = lazy(() => import('@/pages/transports-index-page'));
const TransportsPage = lazy(() => import('@/pages/transports-page'));

function RouteFallback() {
  return (
    <div className="flex min-h-64 items-center justify-center p-6 text-sm text-muted-foreground">
      Ładowanie…
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<CalculatorPage />} />
          <Route path="/transporty" element={<TransportsIndexPage />} />
          <Route path="/transporty/:grain" element={<TransportsPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
