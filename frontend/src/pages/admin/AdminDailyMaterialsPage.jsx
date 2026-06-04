import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import UploadMarketingExcel from '../../components/marketing/UploadMarketingExcel';
import UploadPasteMarketingRecipients from '../../components/marketing/UploadPasteMarketingRecipients';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminDailyMaterialsPage() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    sendDate: '',
    status: 'active',
  });
  const [file, setFile] = useState(null);

  const [recipients, setRecipients] = useState([]);
  const [recipientTotal, setRecipientTotal] = useState(0);
  const [recipientPage, setRecipientPage] = useState(1);
  const [recipientPages, setRecipientPages] = useState(1);
  const [recipientsLoading, setRecipientsLoading] = useState(true);

  const [manualForm, setManualForm] = useState({ name: '', email: '', mobile: '', source: 'Manual' });
  const [manualSaving, setManualSaving] = useState(false);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/materials');
      setMaterials(res.data?.materials || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadRecipients = useCallback(async () => {
    setRecipientsLoading(true);
    try {
      const res = await api.get('/materials/recipients', {
        params: { page: recipientPage, limit: 50 },
      });
      setRecipients(res.data?.recipients || []);
      setRecipientTotal(res.data?.total || 0);
      setRecipientPages(res.data?.pages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load email list');
    } finally {
      setRecipientsLoading(false);
    }
  }, [recipientPage, toast]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  const onRecipientImportSuccess = () => {
    setRecipientPage(1);
    loadRecipients();
  };

  const handleClearList = async () => {
    if (!window.confirm('Clear entire email list? Daily emails will not go to anyone until you upload again.')) {
      return;
    }
    try {
      const res = await api.delete('/materials/recipients/clear');
      toast.success(res.data?.message || 'List cleared');
      setRecipientPage(1);
      loadRecipients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not clear list');
    }
  };

  const handleRemoveRecipient = async (r) => {
    const id = r._id || r.id;
    try {
      await api.delete(`/materials/recipients/${id}`);
      toast.success('Removed from email list');
      loadRecipients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Remove failed');
    }
  };

  const submitManual = async (e) => {
    e.preventDefault();
    const name = manualForm.name.trim();
    const email = manualForm.email.trim();
    if (!name || !email) {
      toast.error('Name and email are required');
      return;
    }
    setManualSaving(true);
    try {
      await api.post('/materials/recipients', {
        name,
        email,
        mobile: manualForm.mobile.trim(),
        source: manualForm.source || 'Manual',
      });
      toast.success('Recipient added');
      setManualForm({ name: '', email: '', mobile: '', source: 'Manual' });
      loadRecipients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add recipient');
    } finally {
      setManualSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!form.sendDate) {
      toast.error('Send date is required');
      return;
    }
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }
    if (recipientTotal === 0) {
      toast.error('Upload email list first (Excel or paste)');
      return;
    }
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('title', form.title.trim());
    body.append('description', form.description.trim());
    body.append('sendDate', form.sendDate);
    body.append('status', form.status);

    setSubmitting(true);
    try {
      await api.post('/materials', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Daily material saved');
      setForm({ title: '', description: '', sendDate: '', status: 'active' });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save material');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (material) => {
    const next = material.status === 'active' ? 'inactive' : 'active';
    setBusyId(material._id || material.id);
    try {
      await api.patch(`/materials/${material._id || material.id}`, { status: next });
      toast.success(next === 'active' ? 'Material activated' : 'Material deactivated');
      loadMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (material) => {
    if (!window.confirm(`Delete "${material.title}"? This cannot be undone.`)) return;
    setBusyId(material._id || material.id);
    try {
      await api.delete(`/materials/${material._id || material.id}`);
      toast.success('Material deleted');
      loadMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="app-card">
        <h2 className="section-heading">Upload email recipients</h2>
        <p className="muted-text" style={{ marginBottom: 12 }}>
          Same as <strong>Upload Leads</strong> — Excel drag-drop or paste. Daily study material goes
          only to this list ({recipientTotal} recipients), not fresh CRM leads.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            className="app-btn app-btn-secondary app-btn-sm"
            disabled={recipientTotal === 0}
            onClick={handleClearList}
          >
            Clear entire list
          </button>
        </div>
        <UploadMarketingExcel onSuccess={onRecipientImportSuccess} />
        <UploadPasteMarketingRecipients onSuccess={onRecipientImportSuccess} />
      </div>

      <div className="app-card">
        <h2 className="section-heading">Add recipient manually</h2>
        <form onSubmit={submitManual} className="form-row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input
            className="app-input"
            placeholder="Full name *"
            value={manualForm.name}
            onChange={(e) => setManualForm((p) => ({ ...p, name: e.target.value }))}
            style={{ minWidth: 220, flex: '1 1 220px' }}
          />
          <input
            className="app-input"
            placeholder="Email *"
            value={manualForm.email}
            onChange={(e) => setManualForm((p) => ({ ...p, email: e.target.value }))}
            style={{ minWidth: 220, flex: '1 1 220px' }}
          />
          <input
            className="app-input"
            placeholder="Phone (optional)"
            value={manualForm.mobile}
            onChange={(e) => setManualForm((p) => ({ ...p, mobile: e.target.value }))}
            style={{ minWidth: 180, flex: '1 1 180px' }}
          />
          <input
            className="app-input"
            placeholder="Source (e.g. Lost list)"
            value={manualForm.source}
            onChange={(e) => setManualForm((p) => ({ ...p, source: e.target.value }))}
            style={{ minWidth: 180, flex: '1 1 180px' }}
          />
          <button type="submit" className="app-btn app-btn-primary" disabled={manualSaving}>
            {manualSaving ? 'Saving…' : 'Add recipient'}
          </button>
        </form>
        <p className="muted-text" style={{ marginTop: 10 }}>
          Duplicate emails are skipped automatically.
        </p>
      </div>

      <div className="app-card">
        <h2 className="section-heading">Email list ({recipientTotal})</h2>
        {recipientsLoading ? (
          <p className="muted-text">Loading…</p>
        ) : recipients.length === 0 ? (
          <p className="muted-text">No recipients yet. Upload Excel or paste data above.</p>
        ) : (
          <>
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((r) => (
                    <tr key={r._id || r.id}>
                      <td>{r.name}</td>
                      <td>{r.email}</td>
                      <td>{r.mobile || '—'}</td>
                      <td>{r.source || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="app-btn app-btn-danger app-btn-sm"
                          onClick={() => handleRemoveRecipient(r)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {recipientPages > 1 && (
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="app-btn app-btn-secondary app-btn-sm"
                  disabled={recipientPage <= 1}
                  onClick={() => setRecipientPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="muted-text">
                  Page {recipientPage} of {recipientPages}
                </span>
                <button
                  type="button"
                  className="app-btn app-btn-secondary app-btn-sm"
                  disabled={recipientPage >= recipientPages}
                  onClick={() => setRecipientPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="app-card">
        <h2 className="section-heading">Add Daily Material</h2>
        <p className="muted-text" style={{ marginBottom: '1rem' }}>
          PDF + send date. On that day at scheduled time, email goes to uploaded list only (
          {recipientTotal} recipients).
        </p>
        <form onSubmit={handleSubmit} className="lead-form-grid">
          <label>
            <span>Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Day 12 — Reading Comprehension"
              required
            />
          </label>
          <label>
            <span>Send date</span>
            <input
              type="date"
              value={form.sendDate}
              onChange={(e) => setForm((f) => ({ ...f, sendDate: e.target.value }))}
              required
            />
          </label>
          <label className="full-width">
            <span>Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short message included in the email body"
            />
          </label>
          <label>
            <span>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            <span>PDF file</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <div className="full-width">
            <button type="submit" className="app-btn app-btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Upload material'}
            </button>
          </div>
        </form>
      </div>

      <div className="app-card">
        <h2 className="section-heading">Uploaded materials</h2>
        {loading ? (
          <p className="muted-text">Loading…</p>
        ) : materials.length === 0 ? (
          <p className="muted-text">No materials yet.</p>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Send date</th>
                  <th>Status</th>
                  <th>PDF</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const id = m._id || m.id;
                  const busy = busyId === id;
                  return (
                    <tr key={id}>
                      <td>
                        <strong>{m.title}</strong>
                        {m.description ? (
                          <p className="muted-text" style={{ margin: '4px 0 0', fontSize: 12 }}>
                            {m.description.slice(0, 80)}
                            {m.description.length > 80 ? '…' : ''}
                          </p>
                        ) : null}
                      </td>
                      <td>{formatDate(m.sendDate)}</td>
                      <td>
                        <span
                          className={`status-pill ${m.status === 'active' ? 'status-pill-won' : 'status-pill-lost'}`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td>
                        {m.pdfUrl ? (
                          <a href={m.pdfUrl} target="_blank" rel="noreferrer" className="link-btn">
                            View PDF
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="app-btn app-btn-secondary app-btn-sm"
                          disabled={busy}
                          onClick={() => toggleStatus(m)}
                        >
                          {m.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="app-btn app-btn-danger app-btn-sm"
                          disabled={busy}
                          onClick={() => handleDelete(m)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
