import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationBell from '../NotificationBell';

export default function Topbar({ title }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{title}</h1>
        <p className="topbar-subtitle">Mentors Daily · Sales CRM</p>
      </div>
      <div className="topbar-right">
        <NotificationBell />
        <button
          type="button"
          className="icon-btn topbar-theme-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <div className="topbar-user-chip">
          <span className="topbar-welcome">{user?.name}</span>
          <span className={`topbar-badge topbar-badge-${user?.role}`}>
            {user?.role === 'admin' ? 'Admin' : 'Sales'}
          </span>
        </div>
        <button type="button" onClick={handleLogout} className="topbar-logout">
          Logout
        </button>
      </div>
    </header>
  );
}
