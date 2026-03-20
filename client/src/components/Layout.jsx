import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Calendar, ListTodo, BookTemplate, BarChart3,
  LogOut, Menu, X, Zap
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import './Layout.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/templates', icon: BookTemplate, label: 'Templates' },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Zap size={22} className="logo-icon" />
            <span>LifeFlow</span>
          </div>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <div className="sidebar-footer-actions">
            <NotificationBell />
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-wrapper">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-logo">
            <Zap size={18} className="logo-icon" />
            <span>LifeFlow</span>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
