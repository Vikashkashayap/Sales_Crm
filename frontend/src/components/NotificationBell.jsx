import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setData(res.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    fetchNotifications();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    fetchNotifications();
  };

  return (
    <div className="notification-bell" ref={ref}>
      <button type="button" className="icon-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        🔔
        {data.unreadCount > 0 && <span className="notification-badge">{data.unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span>Notifications</span>
            {data.unreadCount > 0 && (
              <button type="button" className="link-btn" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-list">
            {data.notifications.length === 0 ? (
              <p className="muted-text" style={{ padding: 16 }}>No notifications</p>
            ) : (
              data.notifications.map((n) => (
                <div
                  key={n._id}
                  className={`notification-item ${n.read ? '' : 'notification-unread'}`}
                  onClick={() => !n.read && markRead(n._id)}
                >
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
