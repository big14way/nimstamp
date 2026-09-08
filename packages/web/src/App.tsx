import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Spinner } from './components/ui';
import RolePicker from './pages/RolePicker';
import CardPage from './pages/Card';

const Claim = lazy(() => import('./pages/Claim'));
const Redeem = lazy(() => import('./pages/Redeem'));
const MerchantSetup = lazy(() => import('./pages/MerchantSetup'));
const MerchantLogin = lazy(() => import('./pages/MerchantLogin'));
const MerchantDashboard = lazy(() => import('./pages/MerchantDashboard'));
const Stats = lazy(() => import('./pages/Stats'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-ink-soft">
          <Spinner />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<RolePicker />} />
        <Route path="/c/:cardId" element={<CardPage />} />
        <Route path="/c/:cardId/claim" element={<Claim />} />
        <Route path="/c/:cardId/redeem/:id" element={<Redeem />} />
        <Route path="/m" element={<MerchantDashboard />} />
        <Route path="/m/setup" element={<MerchantSetup />} />
        <Route path="/m/login" element={<MerchantLogin />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
