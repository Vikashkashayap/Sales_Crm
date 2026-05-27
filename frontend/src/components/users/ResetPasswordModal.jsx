import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

export default function ResetPasswordModal({ open, user, onClose, onSaved }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setConfirmPassword('');
  }, [open, user?._id]);

  if (!open || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password kam se kam 6 characters ka hona chahiye');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords match nahi kar rahe');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/users/${user._id}`, { password });
      toast.success(`${user.name} ka password reset ho gaya`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password reset failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content app-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="section-heading" style={{ margin: 0 }}>Reset password — {user.name}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal-subtitle" style={{ marginTop: 8 }}>
          Naya password set karo. User ko manually batana hoga.
        </p>
        <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 16 }}>
          <label>
            New password
            <input
              type="password"
              className="app-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              minLength={6}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              className="app-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Dubara type karo"
              minLength={6}
              required
              autoComplete="new-password"
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="app-btn app-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="app-btn app-btn-success" disabled={saving}>
              {saving ? 'Resetting…' : 'Reset password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
