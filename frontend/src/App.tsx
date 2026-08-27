import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/auth-context';
import { LoadingScreen } from './components/LoadingScreen';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status === 'authenticated') return <Navigate to="/account" replace />;
  return children;
}

function Protected({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <LoadingScreen />;
  if (status !== 'authenticated') return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  const { status } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/account" element={<Protected><AccountPage /></Protected>} />
      <Route path="*" element={<Navigate to={status === 'authenticated' ? '/account' : '/login'} replace />} />
    </Routes>
  );
}
