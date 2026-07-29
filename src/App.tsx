import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout';
import CalculatorPage from '@/pages/calculator-page';
import TransportsPage from '@/pages/transports-page';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CalculatorPage />} />
        <Route path="/transporty" element={<TransportsPage />} />
      </Routes>
    </Layout>
  );
}
