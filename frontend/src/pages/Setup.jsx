import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function Setup() {
  const [name, setName] = useState('Admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/seed-admin', { name, email, password });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Admin create nahi ho paya');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <p className="auth-success">Admin account ban gaya. Login page par redirect ho rahe hain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/mentors-daily-logo.png" alt="Mentors Daily" className="auth-logo" />
        <h1 className="auth-title">Sales CRM</h1>
        <p className="auth-subtitle">Pehli baar? Admin ID aur Password set karo</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <input
            type="text"
            placeholder="Name (e.g. Admin)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="app-input"
          />
          <input
            type="email"
            placeholder="Admin Email (ID)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="app-input"
          />
          <input
            type="password"
            placeholder="Password (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="app-input"
          />
          <button type="submit" disabled={loading} className="app-btn app-btn-success" style={{ width: '100%' }}>
            {loading ? 'Ban raha hai...' : 'Admin Register Karo'}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/login" className="auth-link">Pehle se admin hai? Login karo</Link>
        </p>
      </div>
    </div>
  );
}
