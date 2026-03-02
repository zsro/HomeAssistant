import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import StarPrep from './pages/StarPrep';
import Family from './pages/Family';
import './App.css';

// 受保护的路由组件
function ProtectedRoute({ children }) {
  const { isAuthenticated, fetchUser } = useAuthStore();
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, [isAuthenticated]);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// 导航栏组件
function Navbar() {
  const { user, family, logout, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) return null;
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-gray-900">
              家庭计划
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link 
                to="/star-prep" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                星星预备班
              </Link>
              <Link 
                to="/family" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                家庭管理
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
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

// 首页组件
function Home() {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Navigate to="/star-prep" replace />;
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />
          <Route 
            path="/star-prep" 
            element={
              <ProtectedRoute>
                <StarPrep />
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
