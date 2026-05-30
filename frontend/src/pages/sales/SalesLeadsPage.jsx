import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LeadTable from '../../components/LeadTable';
import LeadFilters from '../../components/leads/LeadFilters';
import KanbanBoard from '../../components/leads/KanbanBoard';
import LeadDetailDrawer from '../../components/leads/LeadDetailDrawer';
import RegisterStudentModal from '../../components/admissions/RegisterStudentModal';
import { useStudentRegistration } from '../../hooks/useStudentRegistration';

export default function SalesLeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table');
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [detailId, setDetailId] = useState(null);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      const res = await api.get(`/leads?${params}`);
      const data = res.data;
      setLeads(Array.isArray(data) ? data : data.leads || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    api.get('/users/sales')
      .then((res) => setSalesUsers(res.data || []))
      .catch(() => setSalesUsers([]));
  }, []);

  const silentRefresh = useCallback(() => fetchData({ silent: true }), [fetchData]);

  const patchLead = useCallback((id, patch) => {
    setLeads((prev) =>
      prev.map((l) => (String(l._id) === String(id) ? { ...l, ...patch } : l))
    );
  }, []);

  const removeLeads = useCallback((ids) => {
    const idSet = new Set(ids.map(String));
    setLeads((prev) => prev.filter((l) => !idSet.has(String(l._id))));
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

  return (
    <div>
      <div className="page-toolbar">
        <h2 className="section-heading" style={{ margin: 0 }}>My Leads</h2>
        <div className="view-toggle">
          <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
          <button type="button" className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>Kanban</button>
        </div>
      </div>
      <div className="app-card" style={{ marginBottom: 16 }}>
        <LeadFilters filters={filters} onChange={setFilters} isAdmin={false} />
      </div>
      <div className="app-card">
        {loading ? (
          <div className="skeleton-loader">Loading...</div>
        ) : view === 'kanban' ? (
          <KanbanBoard leads={leads} onRefresh={silentRefresh} isAdmin={false} onStatusChange={handleStatusChange} />
        ) : (
          <LeadTable
            leads={leads}
            onRefresh={silentRefresh}
            onLeadPatched={patchLead}
            onLeadsRemoved={removeLeads}
            isAdmin={false}
            canTransferLeads
            currentUserId={user?._id}
            salesUsers={salesUsers}
            onViewLead={setDetailId}
            registeredLeadIds={registeredLeadIds}
            onStatusChange={handleStatusChange}
            onRegisterStudent={handleRegisterClick}
          />
        )}
      </div>
      <LeadDetailDrawer leadId={detailId} onClose={() => setDetailId(null)} onRefresh={silentRefresh} />
      <RegisterStudentModal
        open={!!registerLead}
        lead={registerLead}
        isAlreadyRegistered={
          registerLead ? registeredLeadIds.has(String(registerLead._id)) : false
        }
        onClose={() => setRegisterLead(null)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
}
