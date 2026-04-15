import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useEffectEvent } from 'react';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Family from './pages/Family';
import Pinyin from './pages/Pinyin';
import ControlHome from './pages/control/ControlHome';
import ControlDevice from './pages/control/ControlDevice';
import './App.css';

function ProtectedRoute({ children, loginPath = '/login' }) {
  const { isAuthenticated, fetchUser } = useAuthStore();
  const location = useLocation();

  const syncCurrentUser = useEffectEvent(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      syncCurrentUser();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  return children;
}

function Navbar() {
  const { user, family, logout, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return null;
  }

  const linkClassName = ({ isActive }) => (
    `px-3 py-2 rounded-full text-sm font-medium transition-colors ${
      isActive
        ? 'bg-slate-900 text-white'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:space-x-8">
            <NavLink to="/" className="text-xl font-bold text-gray-900">
              家庭计划
            </NavLink>
            <div className="flex flex-wrap gap-2">
              <NavLink to="/" className={linkClassName}>
                首页
              </NavLink>
              <NavLink to="/pinyin" className={linkClassName}>
                拼音学习
              </NavLink>
              <NavLink to="/family" className={linkClassName}>
                家庭管理
              </NavLink>
              <NavLink to="/control" className={linkClassName}>
                控制端
              </NavLink>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {family && (
              <span className="text-sm text-gray-500">
                家庭码: <span className="font-mono font-medium">{family.code}</span>
              </span>
            )}
            <span className="text-sm text-gray-700">{user?.name}</span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-700"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/control/login" element={<Login />} />
        <Route path="/control/register" element={<Register />} />
        <Route
          path="/control"
          element={
            <ProtectedRoute loginPath="/control/login">
              <ControlHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/control/device/:deviceId"
          element={
            <ProtectedRoute loginPath="/control/login">
              <ControlDevice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pinyin"
          element={
            <ProtectedRoute>
              <Pinyin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/family"
          element={
            <ProtectedRoute>
              <Family />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
