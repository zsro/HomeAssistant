import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/auth-context';
import { LoadingScreen } from './components/LoadingScreen';
import { AccountPage } from './pages/AccountPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MathPrintablePage } from './pages/MathPrintablePage';
import { PinyinPrintablePage } from './pages/PinyinPrintablePage';
import { PrinterPage } from './pages/PrinterPage';
import { RegisterPage } from './pages/RegisterPage';

const RichmanPage = lazy(() => import('./pages/RichmanPage').then((module) => ({ default: module.RichmanPage })));

const RichmanOnlinePage = lazy(() => import('./pages/RichmanOnlinePage').then(m => ({ default: m.RichmanOnlinePage })));
const RichmanNetworkGamePage = lazy(() => import('./pages/RichmanOnlinePage').then(m => ({ default: m.RichmanNetworkGamePage })));

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return children;
}

function Protected({ children, retainOnExpiry = false }: { children: React.ReactNode; retainOnExpiry?: boolean }) {
  const { status } = useAuth();
  const admitted = useRef(false);
  if (status === 'authenticated') admitted.current = true;
  // An expired token must not unmount an already running local Richman game.
  // Initial access still requires authentication; save requests remain authenticated.
  if (retainOnExpiry && admitted.current) return children;
  if (status === 'loading') return <LoadingScreen />;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}

export function App() {
  const { status } = useAuth();

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
        <Route path="/" element={<Protected><HomePage /></Protected>} />
        <Route path="/account" element={<Protected><AccountPage /></Protected>} />
        <Route path="/modules/richman/online" element={<Protected><Suspense fallback={<LoadingScreen />}><RichmanOnlinePage /></Suspense></Protected>} />
        <Route path="/modules/richman/online/rooms/:roomId" element={<Protected><Suspense fallback={<LoadingScreen />}><RichmanOnlinePage /></Suspense></Protected>} />
        <Route path="/modules/richman/online/games/:gameId" element={<Protected retainOnExpiry><Suspense fallback={<LoadingScreen />}><RichmanNetworkGamePage /></Suspense></Protected>} />
        <Route path="/modules/richman" element={<Protected retainOnExpiry><Suspense fallback={<LoadingScreen />}><RichmanPage /></Suspense></Protected>} />
        <Route path="/modules/printer" element={<Protected><PrinterPage /></Protected>} />
        <Route path="/modules/printer/kindergarten/math" element={<Protected><MathPrintablePage /></Protected>} />
        <Route path="/modules/printer/kindergarten/pinyin" element={<Protected><PinyinPrintablePage /></Protected>} />
        <Route path="*" element={<Navigate to={status === 'authenticated' ? '/' : '/login'} replace />} />
      </Routes>
    </>
  );
}
