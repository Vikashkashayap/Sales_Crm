import React, { useState } from 'react';
import api from '../api/axios';

export default function UploadPasteLeads({ onSuccess, assignedTo = '' }) {
  const [text, setText] = useState('');
  const [source, setSource] = useState('Paste Upload');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData('text');
    if (!pasted?.trim()) return;
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Paste Excel data first (select rows in Excel, Ctrl+C, then Ctrl+V here).');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data } = await api.post('/leads/upload-paste', {
        text: text.trim(),
        source: source.trim() || 'Paste Upload',
        ...(assignedTo ? { assignedTo } : {}),
      });
      const dup = data.skippedDuplicates ? ` (${data.skippedDuplicates} duplicates skipped)` : '';
      setMessage(`${data.message || 'Success'}${dup}`);
      setText('');
      if (onSuccess) onSuccess();
    } catch (err) {
      const data = err.response?.data;
      let msg = data?.message || 'Import failed';
      if (data?.hint) msg += ` ${data.hint}`;
      if (data?.headers?.length) {
        msg += ` (Columns found: ${data.headers.filter(Boolean).join(', ')})`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const lineCount = text.trim() ? text.trim().split(/\r?\n/).length : 0;

  return (
    <div className="upload-paste" style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
      <h3 className="section-heading" style={{ fontSize: 16, marginBottom: 8 }}>
        Paste from Excel
      </h3>
      <p className="muted-text" style={{ marginBottom: 12 }}>
        Copy rows from Google Sheets / Excel (<strong>Ctrl+C</strong>) and paste below (<strong>Ctrl+V</strong>).
        Header row optional — 9-column UPSC form layout is auto-detected. Each row needs{' '}
        <strong>full_name</strong> + <strong>phone_number or email</strong>.
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          className="app-input upload-paste-area"
          placeholder={
            'Paste Excel rows here…\nExample:\n' +
            'are_you_preparing_for_upsc?\tattempt_year?\thow_many_hours_do_you_study_for_upsc_on_daily_basis?\t' +
            'why_do_you_want_to_appear_for_upsc?\tfull_name\temail\tphone_number\tgender\tdate_of_birth\n' +
            'Yes\t2026\t5\tIAS dream\tRahul Kumar\trahul@example.com\t9876543210\tMale\t01/01/2000'
          }
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
          onPaste={handlePaste}
          rows={8}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 160,
            resize: 'vertical',
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        />
        <div className="form-row" style={{ alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
          <input
            className="app-input"
            placeholder="Source label (e.g. Walk-in list)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={{ minWidth: 200, flex: '1 1 200px', maxWidth: 320 }}
          />
          <span className="muted-text" style={{ fontSize: 13 }}>
            {lineCount > 0 ? `${lineCount} line(s) pasted` : 'No data yet'}
          </span>
          <button type="submit" disabled={loading || !text.trim()} className="app-btn app-btn-primary">
            {loading ? 'Importing…' : 'Import pasted leads'}
          </button>
        </div>
      </form>
      {message && <p className="upload-success" style={{ marginTop: 12 }}>{message}</p>}
      {error && <p className="upload-error" style={{ marginTop: 12 }}>{error}</p>}
    </div>
  );
}
