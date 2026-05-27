import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getPaymentsDashboard,
  markInstallmentPaid,
  getStudentPaymentHistory,
  resendReceiptEmail,
} from '../controllers/paymentController.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getPaymentsDashboard);
router.post('/students/:studentId/mark-paid', markInstallmentPaid);
router.get('/students/:studentId/history', getStudentPaymentHistory);
router.post('/:paymentId/resend', resendReceiptEmail);

export default router;
