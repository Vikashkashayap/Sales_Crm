import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import LeadTable from '../../components/LeadTable';
import LeadFilters from '../../components/leads/LeadFilters';
import KanbanBoard from '../../components/leads/KanbanBoard';
import LeadDetailDrawer from '../../components/leads/LeadDetailDrawer';

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table');
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [detailId, setDetailId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

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
          <KanbanBoard leads={leads} onRefresh={fetchData} isAdmin={false} />
        ) : (
          <LeadTable leads={leads} onRefresh={fetchData} isAdmin={false} onViewLead={setDetailId} />
        )}
      </div>
      <LeadDetailDrawer leadId={detailId} onClose={() => setDetailId(null)} onRefresh={fetchData} />
    </div>
  );
}
