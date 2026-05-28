import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

export default function SetTargetModal({ open, bda, onClose, onSaved }) {
  const toast = useToast();
  const [admissionTarget, setAdmissionTarget] = useState(2);
  const [revenueTarget, setRevenueTarget] = useState(120000);
  const [monthlyAdmissionTarget, setMonthlyAdmissionTarget] = useState(8);
  const [monthlyRevenueTarget, setMonthlyRevenueTarget] = useState(500000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !bda) return;
    setAdmissionTarget(bda.weeklyAdmissionTarget ?? 2);
    setRevenueTarget(bda.weeklyRevenueTarget ?? 120000);
    setMonthlyAdmissionTarget(bda.monthlyAdmissionTarget ?? 8);
    setMonthlyRevenueTarget(bda.monthlyRevenueTarget ?? 500000);
  }, [open, bda]);

  if (!open || !bda) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/performance/bda/${bda.userId}/targets`, {
        weeklyAdmissionTarget: Number(admissionTarget),
        weeklyRevenueTarget: Number(revenueTarget),
        monthlyAdmissionTarget: Number(monthlyAdmissionTarget),
        monthlyRevenueTarget: Number(monthlyRevenueTarget),
      });
      toast.success('Targets updated');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save targets');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content app-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="section-heading">Set targets — {bda.name}</h3>
        <form onSubmit={handleSubmit} className="target-form">
          <label>
            Weekly admission target
            <input
              type="number"
              className="app-input"
              min={0}
              value={admissionTarget}
              onChange={(e) => setAdmissionTarget(e.target.value)}
              required
            />
          </label>
          <label>
            Weekly revenue target (₹)
            <input
              type="number"
              className="app-input"
              min={0}
              step={1000}
              value={revenueTarget}
              onChange={(e) => setRevenueTarget(e.target.value)}
              required
            />
          </label>
          <label>
            Monthly admission target
            <input
              type="number"
              className="app-input"
              min={0}
              value={monthlyAdmissionTarget}
              onChange={(e) => setMonthlyAdmissionTarget(e.target.value)}
              required
            />
          </label>
          <label>
            Monthly revenue target (₹)
            <input
              type="number"
              className="app-input"
              min={0}
              step={1000}
              value={monthlyRevenueTarget}
              onChange={(e) => setMonthlyRevenueTarget(e.target.value)}
              required
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="app-btn app-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="app-btn app-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save targets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
