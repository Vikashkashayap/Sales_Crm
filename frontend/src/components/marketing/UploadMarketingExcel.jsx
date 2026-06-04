import React, { useState, useRef } from 'react';
import api from '../../api/axios';

export default function UploadMarketingExcel({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Select an Excel (.xlsx) file');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/materials/recipients/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const dup = data.skippedDuplicates ? ` (${data.skippedDuplicates} duplicates skipped)` : '';
      const noEmail = data.skippedNoEmail ? ` (${data.skippedNoEmail} rows without email skipped)` : '';
      const sheets = data.sheetsProcessed?.length
        ? ` Sheets: ${data.sheetsProcessed.join(', ')}.`
        : '';
      setMessage(`${data.message || 'Success'}${dup}${noEmail}${sheets}`);
      setFile(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      const data = err.response?.data;
      let msg = data?.message || 'Upload failed';
      if (data?.hint) msg += ` ${data.hint}`;
      if (data?.headers?.length) {
        msg += ` (Columns found: ${data.headers.filter(Boolean).join(', ')})`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && f.name?.toLowerCase().endsWith('.xlsx')) setFile(f);
    else setError('Please drop an Excel (.xlsx) file');
  };
  const onDragOver = (e) => {
    e.preventDefault();
    setDragover(true);
  };
  const onDragLeave = () => setDragover(false);

  return (
    <div className="upload-excel">
      <p className="muted-text" style={{ marginBottom: 12 }}>
        Same format as <strong>Upload Leads</strong> — all Excel tabs are read. Each row needs{' '}
        <strong>Name</strong> + <strong>Email</strong> (phone-only rows are skipped). Daily material
        emails go only to this list.
      </p>
      <div
        className={`upload-zone ${dragover ? 'upload-zone-dragover' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <div className="upload-zone-label">Drag and drop Excel file here, or click to browse</div>
      </div>
      <form onSubmit={handleSubmit} className="form-row" style={{ alignItems: 'center', marginTop: 16 }}>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setError('');
          }}
        />
        <span className="muted-text" style={{ marginRight: 12 }}>
          {file ? file.name : 'No file chosen'}
        </span>
        <button type="button" onClick={() => inputRef.current?.click()} className="app-btn app-btn-ghost">
          Browse
        </button>
        <button type="submit" disabled={loading || !file} className="app-btn app-btn-primary">
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      {message && <p className="upload-success">{message}</p>}
      {error && <p className="upload-error">{error}</p>}
    </div>
  );
}
