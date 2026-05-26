import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '../../context/AuthContext';

function getTitle(pathname) {
  if (pathname.endsWith('/leads')) return 'Leads';
  if (pathname.endsWith('/admissions')) return 'Admissions';
  if (pathname.endsWith('/payments')) return 'Payments & Finance';
  if (pathname.endsWith('/users')) return 'Users';
  if (pathname.endsWith('/upload')) return 'Upload Leads';
  if (pathname.endsWith('/performance')) return 'BDA Performance';
  if (pathname.endsWith('/followups')) return 'Follow-ups';
  return 'Dashboard';
}

export default function Layout({ basePath }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin';
  const title = getTitle(pathname);

  return (
    <div className="app-layout">
      <Sidebar basePath={basePath} isAdmin={isAdmin} />
      <div className="app-main">
        <Topbar title={title} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
