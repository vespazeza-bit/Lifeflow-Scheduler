import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Activities from './pages/Activities';
import Templates from './pages/Templates';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a2e', color: '#e2e8f0', border: '1px solid #2a2a4a' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1a1a2e' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="activities" element={<Activities />} />
            <Route path="templates" element={<Templates />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
