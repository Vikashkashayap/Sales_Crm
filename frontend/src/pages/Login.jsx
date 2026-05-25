import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(
        { _id: data._id, name: data.name, email: data.email, role: data.role },
        data.token
      );
      navigate(data.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/mentors-daily-logo.png" alt="Mentors Daily" className="auth-logo" />
        <h1 className="auth-title">Sales CRM</h1>
        <p className="auth-subtitle">Sign in to your Mentors Daily workspace</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="app-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="app-input"
          />
          <button type="submit" disabled={loading} className="app-btn app-btn-primary" style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p style={{ marginTop: 12, textAlign: 'center', fontSize: 14 }}>
            <Link to="/setup" className="auth-link">Pehli baar? Admin ID / Password register karo</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
