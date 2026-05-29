import React, { useState } from 'react';
import UploadExcel from '../../components/UploadExcel';
import UploadPasteLeads from '../../components/UploadPasteLeads';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

export default function AdminUploadPage() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', mobile: '', email: '', source: 'Manual' });
  const [saving, setSaving] = useState(false);

  const onChange = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submitManual = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const mobile = form.mobile.trim();
    const email = form.email.trim();
    if (!name || !mobile) {
      toast.error('Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/leads', {
        name,
        mobile,
        email,
        source: form.source || 'Manual',
      });
      toast.success('Lead added successfully');
      setForm({ name: '', mobile: '', email: '', source: 'Manual' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="app-card">
        <h2 className="section-heading">Upload Leads</h2>
        <UploadExcel />
        <UploadPasteLeads />
      </div>

      <div className="app-card">
        <h2 className="section-heading">Add Lead Manually</h2>
        <form onSubmit={submitManual} className="form-row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input
            className="app-input"
            placeholder="Full name *"
            value={form.name}
            onChange={onChange('name')}
            style={{ minWidth: 220, flex: '1 1 220px' }}
          />
          <input
            className="app-input"
            placeholder="Phone *"
            value={form.mobile}
            onChange={onChange('mobile')}
            style={{ minWidth: 180, flex: '1 1 180px' }}
          />
          <input
            className="app-input"
            placeholder="Email (optional)"
            value={form.email}
            onChange={onChange('email')}
            style={{ minWidth: 220, flex: '1 1 220px' }}
          />
          <input
            className="app-input"
            placeholder="Source (e.g. Manual / Walk-in)"
            value={form.source}
            onChange={onChange('source')}
            style={{ minWidth: 180, flex: '1 1 180px' }}
          />
          <button type="submit" className="app-btn app-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add Lead'}
          </button>
        </form>
        <p className="muted-text" style={{ marginTop: 10 }}>
          Tip: Mobile duplicates are blocked automatically (same as Excel upload).
        </p>
      </div>
    </div>
  );
}
