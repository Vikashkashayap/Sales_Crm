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

  const roleLabel = user?.role === 'admin' ? 'Admin' : 'Sales';

  return (
    <header className="topbar app-navbar">
      <div className="navbar-left">
        <nav className="navbar-breadcrumb" aria-label="Breadcrumb">
          <span className="navbar-brand-mark" aria-hidden>M</span>
          <ol className="navbar-crumb-list">
            <li>
              <span className="navbar-crumb">Mentors Daily</span>
            </li>
            <li className="navbar-crumb-sep" aria-hidden>/</li>
            <li>
              <span className="navbar-crumb navbar-crumb--active">{title}</span>
            </li>
          </ol>
        </nav>
        <span className="navbar-tagline">Sales CRM</span>
      </div>

      <div className="navbar-right">
        <NotificationBell />
        <button
          type="button"
          className="icon-btn navbar-icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <div className="navbar-user">
          <span className="navbar-user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          <div className="navbar-user-meta">
            <span className="navbar-user-name">{user?.name}</span>
            <span className={`navbar-user-role navbar-user-role--${user?.role}`}>{roleLabel}</span>
          </div>
        </div>

        <button type="button" onClick={handleLogout} className="navbar-logout">
          Logout
        </button>
      </div>
    </header>
  );
}
