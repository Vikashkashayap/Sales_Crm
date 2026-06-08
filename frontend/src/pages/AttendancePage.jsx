import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AttendanceCard from '../components/attendance/AttendanceCard';
import AttendanceHistoryTable from '../components/attendance/AttendanceHistoryTable';
import AdminTeamAttendance from '../components/attendance/AdminTeamAttendance';
import MonthlyReportPanel from '../components/attendance/MonthlyReportPanel';

async function downloadBlob(url, params, filename) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const blob = new Blob([res.data]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function AttendancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const now = new Date();
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState({ records: [], page: 1, pages: 1, total: 0 });
  const [teamData, setTeamData] = useState(null);
  const [report, setReport] = useState(null);
  const [salesUsers, setSalesUsers] = useState([]);

  const [todayLoading, setTodayLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(isAdmin);
  const [reportLoading, setReportLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedUserId, setSelectedUserId] = useState('');

  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const res = await api.get('/attendance/today');
      setToday(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load today\'s attendance');
    } finally {
      setTodayLoading(false);
    }
  }, [toast]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = { page, limit: 15, month, year };
      if (isAdmin && selectedUserId) params.userId = selectedUserId;
      const res = await api.get('/attendance/history', { params });
      setHistory(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load attendance history');
    } finally {
      setHistoryLoading(false);
    }
  }, [page, month, year, selectedUserId, isAdmin, toast]);

  const fetchTeam = useCallback(async () => {
    if (!isAdmin) return;
    setTeamLoading(true);
    try {
      const res = await api.get('/attendance/team-today');
      setTeamData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load team attendance');
    } finally {
      setTeamLoading(false);
    }
  }, [isAdmin, toast]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const params = { month, year };
      if (isAdmin && selectedUserId) params.userId = selectedUserId;
      const res = await api.get('/attendance/monthly', { params });
      setReport(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load monthly report');
    } finally {
      setReportLoading(false);
    }
  }, [month, year, selectedUserId, isAdmin, toast]);

  const fetchSalesUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/users', { params: { all: true } });
      setSalesUsers(Array.isArray(res.data) ? res.data : res.data.users || []);
    } catch {
      // non-critical
    }
  }, [isAdmin]);

  useEffect(() => { fetchToday(); }, [fetchToday]);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useEffect(() => { fetchReport(); }, [fetchReport]);
  useEffect(() => { fetchSalesUsers(); }, [fetchSalesUsers]);

  // Refresh live hours every minute while clocked in
  useEffect(() => {
    if (!today?.clockedIn || today?.clockedOut) return undefined;
    const interval = setInterval(fetchToday, 60000);
    return () => clearInterval(interval);
  }, [today?.clockedIn, today?.clockedOut, fetchToday]);

  const refreshAll = () => {
    fetchToday();
    fetchHistory();
    fetchReport();
    if (isAdmin) fetchTeam();
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-in');
      toast.success('Clocked in successfully');
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await api.post('/attendance/check-out');
      toast.success('Clocked out successfully');
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Clock out failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async (type) => {
    setExportLoading(true);
    try {
      const params = { month, year };
      if (isAdmin && selectedUserId) params.userId = selectedUserId;
      const ext = type === 'excel' ? 'xlsx' : 'pdf';
      const url = type === 'excel' ? '/attendance/export/excel' : '/attendance/export/pdf';
      await downloadBlob(url, params, `attendance-${year}-${String(month).padStart(2, '0')}.${ext}`);
      toast.success(`Report exported as ${ext.toUpperCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const handleUserChange = (userId) => {
    setSelectedUserId(userId);
    setPage(1);
  };

  return (
    <div className="attendance-page">
      <AttendanceCard
        today={today}
        loading={todayLoading}
        actionLoading={actionLoading}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
      />

      {isAdmin && (
        <AdminTeamAttendance teamData={teamData} loading={teamLoading} />
      )}

      <MonthlyReportPanel
        report={report}
        loading={reportLoading}
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onExportExcel={() => handleExport('excel')}
        onExportPdf={() => handleExport('pdf')}
        exportLoading={exportLoading}
        salesUsers={salesUsers}
        isAdmin={isAdmin}
        selectedUserId={selectedUserId}
        onUserChange={handleUserChange}
      />

      <AttendanceHistoryTable
        records={history.records}
        loading={historyLoading}
        page={history.page}
        pages={history.pages}
        total={history.total}
        isAdmin={isAdmin}
        onPageChange={setPage}
      />
    </div>
  );
}
