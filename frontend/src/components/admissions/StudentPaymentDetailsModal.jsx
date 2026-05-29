import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { PAYMENT_MODES } from '../../utils/studentConstants';

const fmtInr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

function statusBadge(status) {
  const s = (status || 'Pending').toLowerCase();
  return <span className={`badge badge-payment-${s}`}>{status || 'Pending'}</span>;
}

export default function StudentPaymentDetailsModal({ open, studentId, onClose, onUpdated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [student, setStudent] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [resendingWelcome, setResendingWelcome] = useState(false);
  const [welcomeDocs, setWelcomeDocs] = useState([]);
  const [welcomeDocsLoading, setWelcomeDocsLoading] = useState(false);
  const [downloadingKit, setDownloadingKit] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [payingInst, setPayingInst] = useState(null);
  const [payForm, setPayForm] = useState({ paymentMode: 'Cash', transactionId: '' });

  const fetchStudent = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await api.get(`/students/${studentId}`);
      setStudent(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  const fetchWelcomeDocs = async () => {
    if (!studentId) return;
    setWelcomeDocsLoading(true);
    try {
      const res = await api.get(`/students/${studentId}/welcome-kit/documents`);
      setWelcomeDocs(Array.isArray(res.data?.documents) ? res.data.documents : []);
    } catch {
      setWelcomeDocs([]);
    } finally {
      setWelcomeDocsLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!studentId) return;
    setHistoryLoading(true);
    try {
      const res = await api.get(`/payments/students/${studentId}/history`);
      setPaymentHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      // keep UI usable even if history fails
      setPaymentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchStudent();
    fetchHistory();
    fetchWelcomeDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId]);

  const balanceDue = useMemo(() => {
    if (!student) return 0;
    return Math.max(0, (Number(student.finalFee) || 0) - (Number(student.amountPaid) || 0));
  }, [student]);

  const installmentRows = useMemo(() => {
    const list = student?.installments || [];
    return [...list].sort((a, b) => (a.number || 0) - (b.number || 0));
  }, [student]);

  const startMarkPaid = (installmentNumber) => {
    setPayingInst(installmentNumber);
    setPayForm({ paymentMode: 'Cash', transactionId: '' });
  };

  const handleMarkPaid = async (installmentNumber) => {
    if (!student?._id) return;
    setMarking(true);
    try {
      const res = await api.post(`/payments/students/${student._id}/mark-paid`, {
        installmentNumber,
        paymentMode: payForm.paymentMode || 'Cash',
        transactionId: payForm.transactionId?.trim() || '',
      });

      toast.success(res.data?.message || 'Payment successful & receipt sent to student email');
      setPayingInst(null);
      await fetchStudent();
      await fetchHistory();
      onUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark paid');
    } finally {
      setMarking(false);
    }
  };

  const handleViewReceipt = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadReceipt = (url, receiptNumber) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = `${receiptNumber || 'receipt'}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadAllDocuments = async () => {
    if (!student?._id) return;
    setDownloadingKit(true);
    try {
      const res = await api.get(`/students/${student._id}/welcome-kit/download`, {
        responseType: 'blob',
      });
      const medium = student.examMedium || 'English';
      const safeName = (student.fullName || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `WelcomeKit-${safeName}-${medium}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Welcome kit downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not download documents');
    } finally {
      setDownloadingKit(false);
    }
  };

  const handleResendWelcomeKit = async () => {
    if (!student?._id) return;
    setResendingWelcome(true);
    try {
      const res = await api.post(`/students/${student._id}/resend-welcome`);
      const msg = res.data?.message || 'Welcome kit email sent successfully';
      if (res.data?.missingAttachments?.length) {
        toast.warning(msg);
      } else {
        toast.success(msg);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend welcome kit');
    } finally {
      setResendingWelcome(false);
    }
  };

  const handleResend = async (paymentId) => {
    if (!paymentId) return;
    try {
      const res = await api.post(`/payments/${paymentId}/resend`);
      toast.success(res.data?.message || 'Receipt email resent successfully');
      await fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend receipt');
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content student-payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Payment details</h2>
            <p className="modal-subtitle">{student ? student.fullName : 'Loading…'}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {loading || !student ? (
          <div className="skeleton-loader" style={{ margin: 16 }}>Loading payment details…</div>
        ) : (
          <div style={{ padding: 16 }}>
            <div className="app-card" style={{ marginBottom: 14 }}>
              <div className="student-payment-card-title">Onboarding welcome kit</div>
              <dl className="student-payment-dl" style={{ marginTop: 8 }}>
                <dt>Email</dt>
                <dd>{student.email || '—'}</dd>
                <dt>Exam medium</dt>
                <dd>{student.examMedium || 'English'}</dd>
              </dl>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button
                  type="button"
                  className="app-btn app-btn-ghost app-btn-sm"
                  disabled={welcomeDocsLoading}
                  onClick={() => setShowDocPreview((v) => !v)}
                >
                  {showDocPreview ? 'Hide Documents' : 'Preview Documents'}
                </button>
                <button
                  type="button"
                  className="app-btn app-btn-ghost app-btn-sm"
                  disabled={downloadingKit || welcomeDocs.every((d) => !d.exists)}
                  onClick={handleDownloadAllDocuments}
                >
                  {downloadingKit ? 'Preparing…' : 'Download All Documents'}
                </button>
                <button
                  type="button"
                  className="app-btn app-btn-primary app-btn-sm"
                  disabled={!student.email || resendingWelcome}
                  onClick={handleResendWelcomeKit}
                >
                  {resendingWelcome ? 'Sending…' : 'Resend Welcome Kit'}
                </button>
              </div>
              {showDocPreview && (
                <div className="student-installment-list" style={{ marginTop: 12 }}>
                  {welcomeDocsLoading ? (
                    <p className="muted-text">Loading documents…</p>
                  ) : welcomeDocs.length === 0 ? (
                    <p className="muted-text">No documents configured.</p>
                  ) : (
                    welcomeDocs.map((doc) => (
                      <div key={doc.key} className="student-installment-row paid">
                        <div className="student-installment-main">
                          <strong>{doc.label}</strong>
                          <span className="muted-text">{doc.filename}</span>
                        </div>
                        <div className="student-installment-actions">
                          {doc.exists ? (
                            <button
                              type="button"
                              className="app-btn app-btn-ghost app-btn-sm"
                              onClick={() => window.open(doc.previewUrl, '_blank', 'noopener,noreferrer')}
                            >
                              Open PDF
                            </button>
                          ) : (
                            <span style={{ color: 'var(--danger)', fontSize: 12 }}>Missing on server</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {!student.email && (
                <p className="muted-text" style={{ marginTop: 8, fontSize: 12 }}>
                  Add a student email to send the welcome kit with PDF attachments.
                </p>
              )}
            </div>

            <div className="student-payment-grid">
              <div className="app-card student-payment-card">
                <div className="student-payment-card-title">Fee summary</div>
                <dl className="student-payment-dl">
                  <dt>Total Fee</dt><dd>{fmtInr(student.totalFee)}</dd>
                  <dt>Discount</dt><dd>{fmtInr(student.discount)}</dd>
                  <dt>Final Fee</dt><dd><strong>{fmtInr(student.finalFee)}</strong></dd>
                  <dt>Paid</dt><dd>{fmtInr(student.amountPaid)}</dd>
                  <dt>Balance</dt><dd><strong>{fmtInr(balanceDue)}</strong></dd>
                  <dt>Plan</dt><dd>{student.installmentPlan || 'Full Payment'}</dd>
                  {student.installmentStartDate && (
                    <>
                      <dt>First due date</dt>
                      <dd>{new Date(student.installmentStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
                    </>
                  )}
                </dl>
              </div>

              <div className="app-card student-payment-card">
                <div className="student-payment-card-title">Installments / EMI schedule</div>
                {installmentRows.length === 0 ? (
                  <p className="muted-text" style={{ marginTop: 8 }}>No schedule found.</p>
                ) : (
                  <div className="student-installment-list">
                    {installmentRows.map((inst) => {
                      const dueStr = inst.dueDate
                        ? new Date(inst.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—';
                      const remaining = Math.max(0, (Number(inst.amount) || 0) - (Number(inst.paidAmount) || 0));
                      return (
                        <div key={inst.number} className={`student-installment-row ${String(inst.status || '').toLowerCase()}`}>
                          <div className="student-installment-main">
                            <strong>#{inst.number}</strong>
                            <span className="muted-text">Due {dueStr}</span>
                          </div>
                          <div className="student-installment-amounts">
                            <span><strong>{fmtInr(inst.amount)}</strong></span>
                            {Number(inst.paidAmount) > 0 && inst.status !== 'Paid' && (
                              <span className="muted-text">{fmtInr(inst.paidAmount)} paid · {fmtInr(remaining)} left</span>
                            )}
                          </div>
                          <div className="student-installment-actions">
                            {statusBadge(inst.status)}
                            {inst.status !== 'Paid' && payingInst !== inst.number && (
                              <button
                                type="button"
                                className="app-btn app-btn-primary app-btn-sm"
                                disabled={marking}
                                onClick={() => startMarkPaid(inst.number)}
                              >
                                {inst.status === 'Partial' ? 'Pay Remaining' : 'Mark Paid'}
                              </button>
                            )}
                          </div>
                          {inst.status !== 'Paid' && payingInst === inst.number && (
                            <div className="mark-paid-form full-width">
                              <label>
                                Payment mode
                                <select
                                  className="app-select"
                                  value={payForm.paymentMode}
                                  onChange={(e) => setPayForm((f) => ({ ...f, paymentMode: e.target.value }))}
                                >
                                  {PAYMENT_MODES.map((mode) => (
                                    <option key={mode} value={mode}>{mode}</option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Transaction ID (optional)
                                <input
                                  className="app-input"
                                  value={payForm.transactionId}
                                  onChange={(e) => setPayForm((f) => ({ ...f, transactionId: e.target.value }))}
                                  placeholder="UPI ref, card last 4, NEFT UTR…"
                                />
                              </label>
                              <div className="mark-paid-form-actions">
                                <button
                                  type="button"
                                  className="app-btn app-btn-ghost app-btn-sm"
                                  disabled={marking}
                                  onClick={() => setPayingInst(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="app-btn app-btn-primary app-btn-sm"
                                  disabled={marking}
                                  onClick={() => handleMarkPaid(inst.number)}
                                >
                                  {marking ? 'Processing…' : 'Confirm payment'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="app-card" style={{ marginTop: 14 }}>
              <div className="student-payment-card-title">Receipt history</div>
              {historyLoading ? (
                <div className="skeleton-loader" style={{ marginTop: 10 }}>Loading receipts…</div>
              ) : paymentHistory.length === 0 ? (
                <p className="muted-text" style={{ marginTop: 10 }}>No receipts generated yet.</p>
              ) : (
                <div className="student-installment-list" style={{ marginTop: 10 }}>
                  {paymentHistory.map((p) => (
                    <div key={p._id} className="student-installment-row paid">
                      <div className="student-installment-main">
                        <strong>{p.receiptNumber || 'Receipt'}</strong>
                        <span className="muted-text">
                          Installment #{p.installmentNumber} · {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="student-installment-amounts">
                        <span><strong>{fmtInr(p.amountPaid)}</strong></span>
                        <span className="muted-text">{p.paymentMode || 'Cash'}{p.transactionId ? ` · Txn ${p.transactionId}` : ''}</span>
                      </div>
                      <div className="student-installment-actions" style={{ gap: 8 }}>
                        <button
                          type="button"
                          className="app-btn app-btn-ghost app-btn-sm"
                          disabled={!p.receiptUrl}
                          onClick={() => handleViewReceipt(p.receiptUrl)}
                        >
                          View Receipt
                        </button>
                        <button
                          type="button"
                          className="app-btn app-btn-ghost app-btn-sm"
                          disabled={!p.receiptUrl}
                          onClick={() => handleDownloadReceipt(p.receiptUrl, p.receiptNumber)}
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          className="app-btn app-btn-primary app-btn-sm"
                          onClick={() => handleResend(p._id)}
                        >
                          Resend Email
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button type="button" className="app-btn app-btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

