import express from 'express';
import { getStats, getAnalytics, getSalesDashboard } from '../controllers/dashboardController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/stats', getStats);
router.get('/analytics', adminOnly, getAnalytics);
router.get('/sales', getSalesDashboard);

export default router;
