import express from 'express';
import { getBDAPerformance, updateBDATargets } from '../controllers/performanceController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect, adminOnly);

router.get('/bda', getBDAPerformance);
router.patch('/bda/:id/targets', updateBDATargets);

export default router;
