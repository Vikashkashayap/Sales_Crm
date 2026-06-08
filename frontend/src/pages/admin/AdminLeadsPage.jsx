import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LeadTable from '../../components/LeadTable';
import LeadFilters from '../../components/leads/LeadFilters';
import LeadsPageHeader from '../../components/leads/LeadsPageHeader';
import LeadFormModal from '../../components/leads/LeadFormModal';
import KanbanBoard from '../../components/leads/KanbanBoard';
import LeadDetailDrawer from '../../components/leads/LeadDetailDrawer';
import { useToast } from '../../context/ToastContext';
import RegisterStudentModal from '../../components/admissions/RegisterStudentModal';
import { useStudentRegistration } from '../../hooks/useStudentRegistration';

export default function AdminLeadsPage() {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table');
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', assignedTo: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);

      const [leadsRes, usersRes] = await Promise.all([
        api.get(`/leads?${params}`),
        api.get('/users/sales'),
      ]);
      const data = leadsRes.data;
      if (Array.isArray(data)) {
        setLeads(data);
        setTotal(data.length);
      } else {
        setLeads(data.leads || []);
        setTotal(data.total || 0);
      }
      setSalesUsers(usersRes.data);
    } catch (err) {
      toast.error('Failed to load leads');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters, page, toast]);

  const silentRefresh = useCallback(() => fetchData({ silent: true }), [fetchData]);

  const patchLead = useCallback((id, patch) => {
    setLeads((prev) =>
      prev.map((l) => (String(l._id) === String(id) ? { ...l, ...patch } : l))
    );
  }, []);

  const removeLeads = useCallback((ids) => {
    const idSet = new Set(ids.map(String));
    setLeads((prev) => prev.filter((l) => !idSet.has(String(l._id))));
    setTotal((t) => Math.max(0, t - idSet.size));
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const {
    registerLead,
    setRegisterLead,
    registeredLeadIds,
    handleStatusChange,
    handleRegisterClick,
    handleRegistrationSuccess,
  } = useStudentRegistration(silentRefresh);

  const handleExport = async () => {
    try {
      const res = await api.get('/leads/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'leads-export.xlsx';
      a.click();
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="leads-page">
      <LeadsPageHeader
        title="All Leads"
        subtitle="Manage, filter and assign your sales pipeline"
        total={total}
        leads={leads}
        view={view}
        onViewChange={setView}
        actions={(
          <>
            <button type="button" className="app-btn app-btn-ghost" onClick={handleExport}>Export</button>
            <button type="button" className="app-btn app-btn-primary" onClick={() => { setEditLead(null); setShowForm(true); }}>
              + Add Lead
            </button>
          </>
        )}
      />

      <div className="app-card app-card--filters">
        <LeadFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} salesUsers={salesUsers} isAdmin />
        {view === 'table' && (
          <div className="bulk-assign-hint">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            <span>
              Bulk assign: left-side checkboxes se leads select karein, phir &quot;Assign selected&quot; se ek saath BDA ko assign karein.
            </span>
          </div>
        )}
      </div>

      <div className="app-card app-card--table">
        {loading ? (
          <div className="skeleton-loader">Loading leads...</div>
        ) : view === 'kanban' ? (
          <KanbanBoard leads={leads} onRefresh={silentRefresh} isAdmin salesUsers={salesUsers} onStatusChange={handleStatusChange} />
        ) : (
          <>
            <LeadTable
              leads={leads}
              onRefresh={silentRefresh}
              onLeadPatched={patchLead}
              onLeadsRemoved={removeLeads}
              isAdmin
              salesUsers={salesUsers}
              onViewLead={setDetailId}
              onEditLead={(l) => { setEditLead(l); setShowForm(true); }}
              registeredLeadIds={registeredLeadIds}
              onStatusChange={handleStatusChange}
              onRegisterStudent={handleRegisterClick}
            />
            {total > 50 && (
              <div className="pagination">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
                <span>Page {page}</span>
                <button type="button" disabled={leads.length < 50} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>

      <LeadFormModal open={showForm} lead={editLead} salesUsers={salesUsers} onClose={() => setShowForm(false)} onSuccess={silentRefresh} />
      <LeadDetailDrawer leadId={detailId} onClose={() => setDetailId(null)} onRefresh={silentRefresh} />
      <RegisterStudentModal
        open={!!registerLead}
        lead={registerLead}
        salesUsers={salesUsers}
        isAlreadyRegistered={
          registerLead ? registeredLeadIds.has(String(registerLead._id)) : false
        }
        onClose={() => setRegisterLead(null)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
}
