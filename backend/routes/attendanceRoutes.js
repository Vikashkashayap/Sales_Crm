import express from 'express';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceHistory,
  getMonthlyReport,
  getTeamToday,
  exportAttendanceExcel,
  exportAttendancePdf,
} from '../controllers/attendanceController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayAttendance);
router.get('/history', getAttendanceHistory);
router.get('/monthly', getMonthlyReport);
router.get('/team-today', adminOnly, getTeamToday);
router.get('/export/excel', exportAttendanceExcel);
router.get('/export/pdf', exportAttendancePdf);

export default router;
