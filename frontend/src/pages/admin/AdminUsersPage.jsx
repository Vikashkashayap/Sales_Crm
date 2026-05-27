import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import CreateUser from '../../components/CreateUser';
import UserEditModal from '../../components/users/UserEditModal';
import ResetPasswordModal from '../../components/users/ResetPasswordModal';
import { useToast } from '../../context/ToastContext';

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const fetchData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/users?all=true'),
        api.get('/users/stats'),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleActive = async (user) => {
    try {
      await api.put(`/users/${user._id}`, { isActive: !user.isActive });
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('User deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const getUserStats = (id) => stats.find((s) => s.user._id === id);

  return (
    <div>
      <div className="app-card" style={{ marginBottom: 24 }}>
        <h2 className="section-heading">Create User</h2>
        <CreateUser onCreated={fetchData} />
      </div>

      <div className="app-card">
        <h2 className="section-heading">Team Members</h2>
        {loading ? (
          <div className="skeleton-loader">Loading...</div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Leads</th>
                  <th>Conversion</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const s = getUserStats(u._id);
                  return (
                    <tr key={u._id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td><span className="badge">{u.role}</span></td>
                      <td>
                        <span className={`badge ${u.isActive !== false ? 'badge-won' : 'badge-lost'}`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{s?.total ?? '—'}</td>
                      <td>{s ? `${s.conversionRate}%` : '—'}</td>
                      <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          className="app-btn app-btn-ghost app-btn-sm"
                          onClick={() => setEditUser(u)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="app-btn app-btn-primary app-btn-sm"
                          onClick={() => setResetUser(u)}
                        >
                          Reset password
                        </button>
                        <button type="button" className="app-btn app-btn-ghost app-btn-sm" onClick={() => toggleActive(u)}>
                          {u.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        {u.role !== 'admin' && (
                          <button type="button" className="app-btn app-btn-danger app-btn-sm" onClick={() => handleDelete(u._id)}>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserEditModal
        open={Boolean(editUser)}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={fetchData}
      />
      <ResetPasswordModal
        open={Boolean(resetUser)}
        user={resetUser}
        onClose={() => setResetUser(null)}
        onSaved={fetchData}
      />
    </div>
  );
}
