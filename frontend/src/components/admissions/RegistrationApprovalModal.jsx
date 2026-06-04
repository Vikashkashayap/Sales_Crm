import React, { useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { getInstallmentPlanLabel } from '../../utils/paymentHelpers';

const fmtInr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

function InstallmentScheduleReadonly({ student }) {
  const installments = student.installments || [];
  const amountPaidNum = Number(student.amountPaid) || 0;
  const balanceDue = Math.max(0, (Number(student.finalFee) || 0) - amountPaidNum);
  const dueInstallments = installments.filter((inst) => Number(inst.amount) >= 0);
  const showRegistration = amountPaidNum > 0;

  if (!showRegistration && !dueInstallments.length) return null;

  return (
    <div className="installment-preview-box full-width" style={{ marginTop: 16 }}>
      <div className="installment-preview-header">
        <strong>Payment schedule</strong>
        <span className="muted-text">
          {getInstallmentPlanLabel(student.installmentPlan, student.customInstallmentCount)}
        </span>
      </div>
      <ul className="installment-preview-list">
        {showRegistration && (
          <li className="installment-preview-row status-paid">
            <span className="installment-preview-num">Reg.</span>
            <span className="installment-preview-due">At registration</span>
            <span className="installment-preview-amount">{fmtInr(amountPaidNum)}</span>
            <span className="installment-preview-status badge badge-payment-paid">Paid</span>
          </li>
        )}
        {dueInstallments.map((inst) => {
          const dueStr = inst.dueDate
            ? new Date(inst.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '—';
          return (
            <li key={inst.number} className={`installment-preview-row status-${(inst.status || 'pending').toLowerCase()}`}>
              <span className="installment-preview-num">#{inst.number}</span>
              <span className="installment-preview-due">Due {dueStr}</span>
              <span className="installment-preview-amount">{fmtInr(inst.amount)}</span>
              <span className={`installment-preview-status badge badge-payment-${(inst.status || 'pending').toLowerCase()}`}>
                {inst.status}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="installment-preview-summary">
        <span>Registration paid: <strong>{fmtInr(amountPaidNum)}</strong></span>
        <span>Balance due: <strong>{fmtInr(balanceDue)}</strong></span>
      </div>
    </div>
  );
}

export default function RegistrationApprovalModal({ open, student, onClose, onApproved, onRejected }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!open || !student) return null;

  const amountPaidNum = Number(student.amountPaid) || 0;
  const balanceDue = Math.max(0, (Number(student.finalFee) || 0) - amountPaidNum);
  const submittedBy = student.registeredBy?.name || '—';
  const bdaName = student.assignedBda?.name || student.leadBdaName || '—';

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/students/${student._id}/approve`);
      if (res.data?.welcomeEmailSent && !res.data?.welcomeEmailWarning) {
        toast.success(res.data?.welcomeEmailMessage || 'Approved and welcome email sent');
      } else if (res.data?.welcomeEmailMessage) {
        toast.warning(res.data.welcomeEmailMessage);
      } else {
        toast.success('Registration approved');
      }
      onApproved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not approve registration');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await api.post(`/students/${student._id}/reject`, { reason: rejectReason });
      toast.info('Registration rejected');
      onRejected?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reject registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="register-modal app-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="approval-modal-title">
        <div className="register-modal-header">
          <h2 id="approval-modal-title">Review registration</h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="register-modal-body">
          <p className="approval-modal-intro muted-text">
            Submitted by <strong>{submittedBy}</strong>
            {student.createdAt && (
              <> on {new Date(student.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
            )}
            . Approve to register the student and send the welcome email.
          </p>

          <div className="register-confirm" style={{ padding: 0 }}>
            <dl className="confirm-dl">
              <dt>Student</dt><dd>{student.fullName}</dd>
              <dt>Phone</dt><dd>{student.phone}</dd>
              <dt>Email</dt><dd>{student.email || '—'}</dd>
              <dt>City / State</dt><dd>{[student.city, student.state].filter(Boolean).join(', ') || '—'}</dd>
              <dt>Program</dt><dd>{student.programName} ({student.courseType})</dd>
              <dt>Assigned BDA</dt><dd>{bdaName}</dd>
              <dt>Final Fee</dt><dd>{fmtInr(student.finalFee)}</dd>
              <dt>Plan</dt>
              <dd>{getInstallmentPlanLabel(student.installmentPlan, student.customInstallmentCount)}</dd>
              <dt>Registration amount</dt><dd>{fmtInr(amountPaidNum)}</dd>
              <dt>Payment mode</dt><dd>{student.paymentMode || 'Cash'}</dd>
              {student.transactionId && (
                <>
                  <dt>Transaction ID</dt><dd>{student.transactionId}</dd>
                </>
              )}
              <dt>Balance due</dt><dd>{fmtInr(balanceDue)}</dd>
              {student.leadSource && (
                <>
                  <dt>Lead source</dt><dd>{student.leadSource}</dd>
                </>
              )}
              {student.notes && (
                <>
                  <dt>Notes</dt><dd>{student.notes}</dd>
                </>
              )}
            </dl>
            {(student.finalFee > 0) && <InstallmentScheduleReadonly student={student} />}
          </div>

          {rejectMode && (
            <label className="full-width" style={{ display: 'block', marginTop: 16 }}>
              Rejection reason (optional)
              <textarea
                className="app-input"
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection…"
              />
            </label>
          )}
        </div>

        <div className="register-modal-footer">
          <button type="button" className="app-btn app-btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <div style={{ flex: 1 }} />
          {!rejectMode ? (
            <>
              <button
                type="button"
                className="app-btn app-btn-ghost"
                onClick={() => setRejectMode(true)}
                disabled={loading}
              >
                Reject
              </button>
              <button
                type="button"
                className="app-btn app-btn-primary register-next-btn"
                onClick={handleApprove}
                disabled={loading}
              >
                {loading ? 'Approving…' : 'Approve & send email'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="app-btn app-btn-ghost" onClick={() => setRejectMode(false)} disabled={loading}>
                Back
              </button>
              <button
                type="button"
                className="app-btn app-btn-danger"
                onClick={handleReject}
                disabled={loading}
              >
                {loading ? 'Rejecting…' : 'Confirm reject'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
