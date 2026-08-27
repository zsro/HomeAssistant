import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/auth-context';
import { LoadingScreen } from './components/LoadingScreen';
import { AccountPage } from './pages/AccountPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { MathPrintablePage } from './pages/MathPrintablePage';
import { PrinterPage } from './pages/PrinterPage';
import { RegisterPage } from './pages/RegisterPage';

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return children;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
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
        <Route path="/modules/printer" element={<Protected><PrinterPage /></Protected>} />
        <Route path="/modules/printer/kindergarten/math" element={<Protected><MathPrintablePage /></Protected>} />
        <Route path="*" element={<Navigate to={status === 'authenticated' ? '/' : '/login'} replace />} />
      </Routes>
    </>
  );
}
