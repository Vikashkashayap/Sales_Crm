import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import {
  normalizeAttendanceDate,
  calculateTotalHours,
  formatHoursDisplay,
  formatTime,
  formatDateDisplay,
  getMonthRange,
  deriveStatus,
  buildUserFilter,
} from '../utils/attendanceHelpers.js';

const populateUser = { path: 'user', select: 'name email employeeId role' };

async function getTodayRecord(userId) {
  const today = normalizeAttendanceDate();
  return Attendance.findOne({ user: userId, date: today });
}

export const checkIn = async (req, res) => {
  try {
    const today = normalizeAttendanceDate();
    const existing = await Attendance.findOne({ user: req.user._id, date: today });
    if (existing) {
      return res.status(400).json({ message: 'You have already clocked in today' });
    }

    const record = await Attendance.create({
      user: req.user._id,
      date: today,
      clockIn: new Date(),
      status: 'present',
    });

    const populated = await Attendance.findById(record._id).populate(populateUser);
    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already clocked in today' });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const checkOut = async (req, res) => {
  try {
    const record = await getTodayRecord(req.user._id);
    if (!record) {
      return res.status(400).json({ message: 'You have not clocked in today' });
    }
    if (record.clockOut) {
      return res.status(400).json({ message: 'You have already clocked out today' });
    }

    const clockOut = new Date();
    record.clockOut = clockOut;
    record.totalHours = calculateTotalHours(record.clockIn, clockOut);
    record.status = deriveStatus(record.totalHours);
    await record.save();

    const populated = await Attendance.findById(record._id).populate(populateUser);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getTodayAttendance = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.query.userId
      ? req.query.userId
      : req.user._id;

    const record = await getTodayRecord(userId);
    if (!record) {
      return res.json({
        clockedIn: false,
        clockedOut: false,
        record: null,
        liveHours: 0,
      });
    }

    const liveHours = record.clockOut
      ? record.totalHours
      : calculateTotalHours(record.clockIn, new Date());

    res.json({
      clockedIn: true,
      clockedOut: !!record.clockOut,
      record: await Attendance.findById(record._id).populate(populateUser),
      liveHours,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getAttendanceHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = buildUserFilter(req.user, req.query.userId);

    if (req.query.month && req.query.year) {
      const { start, end } = getMonthRange(req.query.year, req.query.month);
      filter.date = { $gte: start, $lt: end };
    }

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate(populateUser)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    res.json({
      records,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const { start, end } = getMonthRange(year, month);

    const filter = { ...buildUserFilter(req.user, req.query.userId), date: { $gte: start, $lt: end } };

    const records = await Attendance.find(filter)
      .populate(populateUser)
      .sort({ date: -1 })
      .lean();

    const totalDays = records.length;
    const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const presentDays = records.filter((r) => r.status === 'present').length;
    const halfDays = records.filter((r) => r.status === 'half-day').length;

    res.json({
      year,
      month,
      summary: {
        totalDays,
        presentDays,
        halfDays,
        totalHours: Math.round(totalHours * 100) / 100,
        totalHoursDisplay: formatHoursDisplay(totalHours),
      },
      records,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getTeamToday = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const today = normalizeAttendanceDate();
    const users = await User.find({ isActive: true, role: { $in: ['sales', 'admin'] } })
      .select('name email employeeId role')
      .sort({ name: 1 })
      .lean();

    const attendanceRecords = await Attendance.find({ date: today })
      .populate(populateUser)
      .lean();

    const recordByUser = new Map(
      attendanceRecords.map((r) => [String(r.user?._id || r.user), r])
    );

    const team = users.map((u) => {
      const record = recordByUser.get(String(u._id));
      let status = 'absent';
      let liveHours = 0;

      if (record) {
        status = record.clockOut ? record.status : 'present';
        liveHours = record.clockOut
          ? record.totalHours
          : calculateTotalHours(record.clockIn, new Date());
      }

      return {
        user: u,
        status,
        isPresent: !!record,
        clockIn: record?.clockIn || null,
        clockOut: record?.clockOut || null,
        totalHours: liveHours,
        totalHoursDisplay: formatHoursDisplay(liveHours),
        recordId: record?._id || null,
      };
    });

    const presentCount = team.filter((t) => t.isPresent).length;
    const absentCount = team.length - presentCount;

    res.json({
      date: today,
      summary: { total: team.length, present: presentCount, absent: absentCount },
      team,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

function buildExportRows(records) {
  return records.map((r) => ({
    Date: formatDateDisplay(r.date),
    Employee: r.user?.name || '',
    'Employee ID': r.user?.employeeId || '',
    Email: r.user?.email || '',
    'Clock In': formatTime(r.clockIn),
    'Clock Out': formatTime(r.clockOut),
    'Total Hours': r.totalHours || 0,
    Status: r.status || '',
  }));
}

async function fetchExportRecords(req) {
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
  const { start, end } = getMonthRange(year, month);
  const filter = { ...buildUserFilter(req.user, req.query.userId), date: { $gte: start, $lt: end } };

  const records = await Attendance.find(filter)
    .populate(populateUser)
    .sort({ date: -1 })
    .lean();

  return { year, month, records };
}

export const exportAttendanceExcel = async (req, res) => {
  try {
    const { year, month, records } = await fetchExportRecords(req);
    const data = buildExportRows(records);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance-${year}-${String(month).padStart(2, '0')}.xlsx`
    );
    res.send(buf);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const exportAttendancePdf = async (req, res) => {
  try {
    const { year, month, records } = await fetchExportRecords(req);
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance-${year}-${String(month).padStart(2, '0')}.pdf`
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(18).text('Attendance Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#64748B').text(monthName, { align: 'center' });
    doc.moveDown(1);
    doc.fillColor('#000000');

    const totalHours = records.reduce((s, r) => s + (r.totalHours || 0), 0);
    doc.fontSize(10).text(`Total Records: ${records.length}  |  Total Hours: ${formatHoursDisplay(totalHours)}`);
    doc.moveDown(0.8);

    const colX = [40, 100, 200, 260, 320, 380, 440];
    const headers = ['Date', 'Employee', 'Clock In', 'Clock Out', 'Hours', 'Status'];
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { width: 90, continued: false }));
    doc.moveDown(0.5);
    doc.font('Helvetica');

    if (records.length === 0) {
      doc.text('No attendance records for this period.');
    } else {
      for (const r of records) {
        if (doc.y > 750) {
          doc.addPage();
        }
        const y = doc.y;
        doc.text(formatDateDisplay(r.date), colX[0], y, { width: 55 });
        doc.text(r.user?.name || '—', colX[1], y, { width: 95 });
        doc.text(formatTime(r.clockIn), colX[2], y, { width: 55 });
        doc.text(formatTime(r.clockOut), colX[3], y, { width: 55 });
        doc.text(String(r.totalHours || 0), colX[4], y, { width: 40 });
        doc.text(r.status || '—', colX[5], y, { width: 60 });
        doc.moveDown(0.6);
      }
    }

    doc.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ message: error.message || 'Server error' });
    }
  }
};
