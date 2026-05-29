import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

const TABS = [
  { id: 'english', label: 'English PDFs' },
  { id: 'hindi', label: 'Hindi PDFs' },
  { id: 'common', label: 'Common' },
];

function formatBytes(n) {
  const b = Number(n) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDocumentManagementPage() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('english');
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [attachWithReceipt, setAttachWithReceipt] = useState(false);
  const [paymentRemindersEnabled, setPaymentRemindersEnabled] = useState(true);
  const [reminderDaysBeforeDue, setReminderDaysBeforeDue] = useState(3);
  const [savingSetting, setSavingSetting] = useState(false);
  const [savingReminderSetting, setSavingReminderSetting] = useState(false);
  const [uploadKey, setUploadKey] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/onboarding-documents');
      setDocuments(res.data?.documents || []);
      setAttachWithReceipt(Boolean(res.data?.attachWelcomeKitWithReceipt));
      setPaymentRemindersEnabled(Boolean(res.data?.paymentRemindersEnabled ?? true));
      setReminderDaysBeforeDue(Number(res.data?.reminderDaysBeforeDue ?? 3));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => documents.filter((d) => d.medium === tab),
    [documents, tab]
  );

  const handleTogglePaymentReminders = async () => {
    const next = !paymentRemindersEnabled;
    setSavingReminderSetting(true);
    try {
      await api.patch('/settings', { paymentRemindersEnabled: next });
      setPaymentRemindersEnabled(next);
      toast.success(
        next
          ? 'Automatic payment reminders are enabled'
          : 'Automatic payment reminders are disabled'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update reminder setting');
    } finally {
      setSavingReminderSetting(false);
    }
  };

  const handleSaveReminderDays = async () => {
    const days = Number(reminderDaysBeforeDue);
    if (!Number.isFinite(days) || days < 0 || days > 30) {
      toast.error('Reminder days must be between 0 and 30');
      return;
    }
    setSavingReminderSetting(true);
    try {
      await api.patch('/settings', { reminderDaysBeforeDue: Math.round(days) });
      toast.success('Reminder days updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update reminder days');
    } finally {
      setSavingReminderSetting(false);
    }
  };

  const handleToggleReceiptKit = async () => {
    const next = !attachWithReceipt;
    setSavingSetting(true);
    try {
      await api.patch('/settings', { attachWelcomeKitWithReceipt: next });
      setAttachWithReceipt(next);
      toast.success(
        next
          ? 'Welcome kit will be attached with fee receipt emails'
          : 'Welcome kit will not be attached with receipt emails'
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update setting');
    } finally {
      setSavingSetting(false);
    }
  };

  const triggerUpload = (key) => {
    setUploadKey(key);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadKey) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    setBusyKey(uploadKey);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/settings/onboarding-documents/${uploadKey}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setBusyKey(null);
      setUploadKey(null);
    }
  };

  const handleDelete = async (key, label) => {
    if (!window.confirm(`Delete "${label}"? Future emails will not include this file until re-uploaded.`)) {
      return;
    }
    setBusyKey(key);
    try {
      await api.delete(`/settings/onboarding-documents/${key}`);
      toast.success('Document deleted');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setBusyKey(null);
    }
  };

  const handlePreview = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="app-card">
        <h2 className="section-heading">Document Management</h2>
        <p className="muted-text" style={{ marginTop: 6, maxWidth: 720 }}>
          Upload onboarding PDFs for welcome and optional receipt emails. Replacing a file updates
          what is sent automatically — no code changes required.
        </p>

        <div
          className="app-card"
          style={{
            marginTop: 16,
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong>Attach Welcome Kit With Receipt</strong>
            <p className="muted-text" style={{ margin: '4px 0 0', fontSize: 13 }}>
              When ON, fee receipt emails also include the student&apos;s medium-specific welcome kit PDFs.
            </p>
          </div>
          <button
            type="button"
            className={`app-btn ${attachWithReceipt ? 'app-btn-primary' : 'app-btn-ghost'}`}
            disabled={savingSetting}
            onClick={handleToggleReceiptKit}
          >
            {savingSetting ? 'Saving…' : attachWithReceipt ? 'ON' : 'OFF'}
          </button>
        </div>

        <div
          className="app-card"
          style={{
            marginTop: 16,
            padding: 14,
            display: 'grid',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <strong>Payment Reminder System</strong>
              <p className="muted-text" style={{ margin: '4px 0 0', fontSize: 13 }}>
                Sends automatic emails before due date, on due date, and 1 day after overdue (daily at 9 AM IST).
              </p>
            </div>
            <button
              type="button"
              className={`app-btn ${paymentRemindersEnabled ? 'app-btn-primary' : 'app-btn-ghost'}`}
              disabled={savingReminderSetting}
              onClick={handleTogglePaymentReminders}
            >
              {savingReminderSetting ? 'Saving…' : paymentRemindersEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <label style={{ display: 'grid', gap: 6, maxWidth: 280 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Reminder days before due date</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="app-input"
                type="number"
                min={0}
                max={30}
                value={reminderDaysBeforeDue}
                onChange={(e) => setReminderDaysBeforeDue(e.target.value)}
                disabled={!paymentRemindersEnabled || savingReminderSetting}
              />
              <button
                type="button"
                className="app-btn app-btn-ghost app-btn-sm"
                disabled={!paymentRemindersEnabled || savingReminderSetting}
                onClick={handleSaveReminderDays}
              >
                Save
              </button>
            </div>
            <span className="muted-text" style={{ fontSize: 12 }}>
              Default: 3 — e.g. due 29 Jun → reminder on 26 Jun, due today on 29 Jun, overdue on 30 Jun.
            </span>
          </label>
        </div>
      </div>

      <div className="app-card">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'app-btn app-btn-primary app-btn-sm' : 'app-btn app-btn-ghost app-btn-sm'}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {loading ? (
          <div className="skeleton-loader">Loading documents…</div>
        ) : filtered.length === 0 ? (
          <p className="muted-text">No documents in this category.</p>
        ) : (
          <div className="student-installment-list">
            {filtered.map((doc) => (
              <div key={doc.key} className="student-installment-row paid">
                <div className="student-installment-main">
                  <strong>{doc.label}</strong>
                  <span className="muted-text">{doc.filename}</span>
                </div>
                <div className="student-installment-amounts">
                  {doc.exists ? (
                    <>
                      <span className="muted-text">{formatBytes(doc.size)}</span>
                      {doc.updatedAt && (
                        <span className="muted-text">
                          Updated {new Date(doc.updatedAt).toLocaleString('en-IN')}
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontSize: 13 }}>Not uploaded</span>
                  )}
                </div>
                <div className="student-installment-actions" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="app-btn app-btn-ghost app-btn-sm"
                    disabled={!doc.exists || busyKey === doc.key}
                    onClick={() => handlePreview(doc.previewUrl)}
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="app-btn app-btn-primary app-btn-sm"
                    disabled={busyKey === doc.key}
                    onClick={() => triggerUpload(doc.key)}
                  >
                    {busyKey === doc.key ? 'Uploading…' : doc.exists ? 'Replace' : 'Upload'}
                  </button>
                  {doc.exists && (
                    <button
                      type="button"
                      className="app-btn app-btn-ghost app-btn-sm"
                      disabled={busyKey === doc.key}
                      onClick={() => handleDelete(doc.key, doc.label)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
