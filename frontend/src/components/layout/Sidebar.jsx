import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItemClass = ({ isActive }) =>
  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`;

const dashboardPath = (base) => (base === '/' ? '/dashboard' : `${base}/dashboard`);
const leadsPath = (base) => (base === '/' ? '/leads' : `${base}/leads`);
const admissionsPath = (base) => (base === '/' ? '/admissions' : `${base}/admissions`);
const paymentsPath = (base) => (base === '/' ? '/payments' : `${base}/payments`);

function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 10.5L12 4l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" strokeLinejoin="round" />
        <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    leads: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
      </svg>
    ),
    upload: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 20h16" strokeLinecap="round" />
      </svg>
    ),
    followups: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 11h18" strokeLinecap="round" />
      </svg>
    ),
    admissions: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 14l9-5-9-5-9 5 9 5z" strokeLinejoin="round" />
        <path d="M12 14v7M5 10v6a7 7 0 0014 0v-6" strokeLinecap="round" />
      </svg>
    ),
    payments: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" strokeLinecap="round" />
      </svg>
    ),
    performance: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 19V5M4 19h16M8 15l3-4 4 6 5-8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" />
        <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  };
  return <span className="sidebar-icon">{icons[name]}</span>;
}

export default function Sidebar({ basePath, isAdmin }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '68px' : '220px'
    );
    return () => {
      document.documentElement.style.removeProperty('--sidebar-width');
    };
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <img
          src="/mentors-daily-logo.png"
          alt="Mentors Daily"
          className="sidebar-logo"
        />
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            {collapsed ? (
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Main</p>
        <NavLink to={dashboardPath(basePath)} className={navItemClass} title="Dashboard">
          <NavIcon name="dashboard" />
          <span className="sidebar-link-label">Dashboard</span>
        </NavLink>
        <NavLink to={leadsPath(basePath)} className={navItemClass} title="Leads">
          <NavIcon name="leads" />
          <span className="sidebar-link-label">Leads</span>
        </NavLink>
        <NavLink to={admissionsPath(basePath)} className={navItemClass} title="Admissions">
          <NavIcon name="admissions" />
          <span className="sidebar-link-label">Admissions</span>
        </NavLink>
        <NavLink to={paymentsPath(basePath)} className={navItemClass} title="Payments & Finance">
          <NavIcon name="payments" />
          <span className="sidebar-link-label">Payments</span>
        </NavLink>

        {isAdmin && (
          <>
            <p className="sidebar-section-label">Admin</p>
            <NavLink to={`${basePath}/performance`} className={navItemClass} title="BDA Performance">
              <NavIcon name="performance" />
              <span className="sidebar-link-label">BDA Performance</span>
            </NavLink>
            <NavLink to={`${basePath}/followups`} className={navItemClass} title="Follow-ups">
              <NavIcon name="followups" />
              <span className="sidebar-link-label">Follow-ups</span>
            </NavLink>
            <NavLink to={`${basePath}/users`} className={navItemClass} title="Users">
              <NavIcon name="users" />
              <span className="sidebar-link-label">Users</span>
            </NavLink>
            <NavLink to={`${basePath}/upload`} className={navItemClass} title="Upload Leads">
              <NavIcon name="upload" />
              <span className="sidebar-link-label">Upload Leads</span>
            </NavLink>
            <p className="sidebar-section-label">Settings</p>
            <NavLink to={`${basePath}/settings/documents`} className={navItemClass} title="Document Management">
              <NavIcon name="settings" />
              <span className="sidebar-link-label">Document Management</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {user && !collapsed && (
          <div className="sidebar-user">
            <span className="sidebar-user-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">{user.role === 'admin' ? 'Admin' : 'Sales'}</span>
            </div>
          </div>
        )}
        <button type="button" onClick={handleLogout} className="sidebar-link sidebar-logout" title="Logout">
          <NavIcon name="logout" />
          <span className="sidebar-link-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
