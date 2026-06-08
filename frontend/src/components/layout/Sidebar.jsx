import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const dashboardPath = (base) => (base === '/' ? '/dashboard' : `${base}/dashboard`);
const leadsPath = (base) => (base === '/' ? '/leads' : `${base}/leads`);
const admissionsPath = (base) => (base === '/' ? '/admissions' : `${base}/admissions`);
const paymentsPath = (base) => (base === '/' ? '/payments' : `${base}/payments`);
const attendancePath = (base) => (base === '/' ? '/attendance' : `${base}/attendance`);

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
    attendance: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
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
    marketing: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M3 11l18-5v8l-18 5V11z" strokeLinejoin="round" />
        <path d="M11 13v8" strokeLinecap="round" />
      </svg>
    ),
    email: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 7l10 7 10-7" strokeLinecap="round" strokeLinejoin="round" />
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

function getNavSections(basePath, isAdmin) {
  const sections = [
    {
      label: 'Main',
      items: [
        { to: dashboardPath(basePath), icon: 'dashboard', label: 'Dashboard', accent: 'blue' },
        { to: leadsPath(basePath), icon: 'leads', label: 'Leads', accent: 'indigo' },
        { to: admissionsPath(basePath), icon: 'admissions', label: 'Admissions', accent: 'purple' },
        { to: paymentsPath(basePath), icon: 'payments', label: 'Payments', accent: 'green' },
        { to: attendancePath(basePath), icon: 'attendance', label: 'Attendance', accent: 'teal' },
      ],
    },
  ];

  if (isAdmin) {
    sections.push(
      {
        label: 'Admin',
        items: [
          { to: `${basePath}/performance`, icon: 'performance', label: 'BDA Performance', accent: 'orange' },
          { to: `${basePath}/followups`, icon: 'followups', label: 'Follow-ups', accent: 'amber' },
          { to: `${basePath}/users`, icon: 'users', label: 'Users', accent: 'cyan' },
          { to: `${basePath}/upload`, icon: 'upload', label: 'Upload Leads', accent: 'teal' },
        ],
      },
      {
        label: 'Marketing',
        items: [
          { to: `${basePath}/marketing/materials`, icon: 'marketing', label: 'Daily Materials', accent: 'pink' },
          { to: `${basePath}/marketing/email-logs`, icon: 'email', label: 'Email Logs', accent: 'violet' },
        ],
      },
      {
        label: 'Settings',
        items: [
          { to: `${basePath}/settings/documents`, icon: 'settings', label: 'Document Management', accent: 'slate' },
        ],
      }
    );
  }

  return sections;
}

function SidebarNavLink({ to, icon, label, accent }) {
  return (
    <NavLink
      to={to}
      title={label}
      className={({ isActive }) =>
        `sidebar-link sidebar-link--${accent}${isActive ? ' sidebar-link-active' : ''}`
      }
    >
      <span className="sidebar-icon-wrap">
        <NavIcon name={icon} />
      </span>
      <span className="sidebar-link-label">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ basePath, isAdmin }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const sections = getNavSections(basePath, isAdmin);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '72px' : '232px'
    );
    return () => {
      document.documentElement.style.removeProperty('--sidebar-width');
    };
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = user?.role === 'admin' ? 'Admin' : 'Sales';
  const roleClass = user?.role === 'admin' ? 'sidebar-role-badge--admin' : 'sidebar-role-badge--sales';

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <img
            src="/mentors-daily-logo.png"
            alt="Mentors Daily"
            className="sidebar-logo"
          />
          {!collapsed && <span className="sidebar-brand-tag">CRM</span>}
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden>
            {collapsed ? (
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.label} className="sidebar-section">
            <p className="sidebar-section-label">{section.label}</p>
            {section.items.map((item) => (
              <SidebarNavLink key={item.to} {...item} />
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user" title={collapsed ? user.name : undefined}>
            <span className="sidebar-user-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            {!collapsed && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name}</span>
                <span className={`sidebar-role-badge ${roleClass}`}>{roleLabel}</span>
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={handleLogout} className="sidebar-link sidebar-logout" title="Logout">
          <span className="sidebar-icon-wrap sidebar-icon-wrap--logout">
            <NavIcon name="logout" />
          </span>
          <span className="sidebar-link-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
