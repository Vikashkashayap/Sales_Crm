import React, { useState } from 'react';
import api from '../api/axios';

export default function CreateUser({ onCreated }) {
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'sales' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/register', newUser);
      setMessage('User created.');
      setNewUser({ name: '', email: '', password: '', role: 'sales' });
      if (onCreated) onCreated();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="form-row">
        <input
          type="text"
          placeholder="Name"
          value={newUser.name}
          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
          required
          className="app-input"
          style={{ maxWidth: 180 }}
        />
        <input
          type="email"
          placeholder="Email"
          value={newUser.email}
          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          required
          className="app-input"
          style={{ maxWidth: 220 }}
        />
        <input
          type="password"
          placeholder="Password (min 6)"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          required
          minLength={6}
          className="app-input"
          style={{ maxWidth: 160 }}
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          className="app-select"
        >
          <option value="sales">Sales</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" disabled={loading} className="app-btn app-btn-success">
          {loading ? 'Creating...' : 'Create'}
        </button>
      </form>
      {message && (
        <p style={{ marginTop: 12, color: message.startsWith('User') ? 'var(--success)' : 'var(--danger)', fontSize: 14 }}>
          {message}
        </p>
      )}
    </div>
  );
}
