import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '../../utils/constants';
import { useToast } from '../../context/ToastContext';

const emptyForm = {
  name: '',
  mobile: '',
  email: '',
  company: '',
  city: '',
  platform: '',
  targetYear: '',
  dateOfBirth: '',
  gender: '',
  source: 'Manual',
  status: 'New',
  priority: 'Medium',
  budget: '',
  requirement: '',
  assignedTo: '',
  followupDate: '',
  dealValue: '',
};

export default function LeadFormModal({ open, onClose, onSuccess, salesUsers = [], lead = null }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(lead ? {
    name: lead.name || '',
    mobile: lead.mobile || '',
    email: lead.email || '',
    company: lead.company || '',
    city: lead.city || '',
    platform: lead.platform || '',
    targetYear: lead.targetYear || '',
    dateOfBirth: lead.dateOfBirth || '',
    gender: lead.gender || '',
    source: lead.source || '',
    status: lead.status || 'New',
    priority: lead.priority || 'Medium',
    budget: lead.budget ?? '',
    requirement: lead.requirement || '',
    assignedTo: lead.assignedTo?._id || lead.assignedTo || '',
    followupDate: lead.followupDate ? new Date(lead.followupDate).toISOString().slice(0, 16) : '',
    dealValue: lead.dealValue ?? '',
    } : { ...emptyForm });
  }, [open, lead]);

  if (!open) return null;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        budget: form.budget === '' ? null : Number(form.budget),
        dealValue: form.dealValue === '' ? null : Number(form.dealValue),
        followupDate: form.followupDate || null,
        assignedTo: form.assignedTo || null,
      };
      if (lead?._id) {
        await api.put(`/leads/${lead._id}`, payload);
        toast.success('Lead updated');
      } else {
        await api.post('/leads', payload);
        toast.success('Lead created');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{lead ? 'Edit Lead' : 'Add Lead'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="lead-form-grid">
          <label>Full Name *<input className="app-input" required value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label>Phone *<input className="app-input" required value={form.mobile} onChange={(e) => set('mobile', e.target.value)} /></label>
          <label>Email<input className="app-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></label>
          <label>Platform<input className="app-input" value={form.platform} onChange={(e) => set('platform', e.target.value)} /></label>
          <label>Target Year<input className="app-input" value={form.targetYear} onChange={(e) => set('targetYear', e.target.value)} /></label>
          <label>Date of Birth<input className="app-input" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></label>
          <label>Gender<input className="app-input" value={form.gender} onChange={(e) => set('gender', e.target.value)} /></label>
          <label>Company<input className="app-input" value={form.company} onChange={(e) => set('company', e.target.value)} /></label>
          <label>City<input className="app-input" value={form.city} onChange={(e) => set('city', e.target.value)} /></label>
          <label>Source<input className="app-input" value={form.source} onChange={(e) => set('source', e.target.value)} /></label>
          <label>Status
            <select className="app-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Priority
            <select className="app-select" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label>Budget<input className="app-input" type="number" value={form.budget} onChange={(e) => set('budget', e.target.value)} /></label>
          <label>Deal Value<input className="app-input" type="number" value={form.dealValue} onChange={(e) => set('dealValue', e.target.value)} /></label>
          <label>Follow-up<input className="app-input" type="datetime-local" value={form.followupDate} onChange={(e) => set('followupDate', e.target.value)} /></label>
          {salesUsers.length > 0 && (
            <label>Assign To
              <select className="app-select" value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
                <option value="">Unassigned</option>
                {salesUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </label>
          )}
          <label className="full-width">Why do you want to prepare?<textarea className="app-input" rows={3} value={form.requirement} onChange={(e) => set('requirement', e.target.value)} /></label>
          <div className="modal-actions full-width">
            <button type="button" className="app-btn app-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading} className="app-btn app-btn-primary">{loading ? 'Saving...' : 'Save Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
