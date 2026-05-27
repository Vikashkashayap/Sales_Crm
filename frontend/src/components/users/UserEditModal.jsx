import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function UserEditModal({ open, user, onClose, onSaved }) {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', role: 'sales', isActive: true });
  const [saving, setSaving] = useState(false);

  const isSelf = user?._id === currentUser?._id;

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'sales',
      isActive: user.isActive !== false,
    });
  }, [open, user]);

  if (!open || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${user._id}`, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: isSelf ? undefined : form.role,
        isActive: isSelf ? undefined : form.isActive,
      });
      toast.success('User updated');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content app-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="section-heading" style={{ margin: 0 }}>Edit user — {user.name}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 16 }}>
          <label>
            Name
            <input
              type="text"
              className="app-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              className="app-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Role
            <select
              className="app-select"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              disabled={isSelf}
            >
              <option value="sales">Sales</option>
              <option value="admin">Admin</option>
            </select>
            {isSelf && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Apna role change nahi kar sakte
              </span>
            )}
          </label>
          <label>
            Status
            <select
              className="app-select"
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}
              disabled={isSelf}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {isSelf && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Apna account deactivate nahi kar sakte
              </span>
            )}
          </label>
          <div className="modal-actions">
            <button type="button" className="app-btn app-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="app-btn app-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
