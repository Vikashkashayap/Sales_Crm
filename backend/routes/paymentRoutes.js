import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getPaymentsDashboard, markInstallmentPaid } from '../controllers/paymentController.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getPaymentsDashboard);
router.post('/students/:studentId/mark-paid', markInstallmentPaid);

export default router;
