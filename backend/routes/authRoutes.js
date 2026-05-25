import express from 'express';
import { register, login, seedAdmin } from '../controllers/authController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.post('/seed-admin', seedAdmin);  // One-time: create first admin (no auth)
router.post('/register', protect, adminOnly, register);

export default router;
