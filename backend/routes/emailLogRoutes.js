import express from 'express';
import { listEmailLogs } from '../controllers/emailLogController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, adminOnly);
router.get('/', listEmailLogs);

export default router;
