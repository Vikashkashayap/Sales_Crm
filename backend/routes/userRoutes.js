import express from 'express';
import {
  getSalesUsers,
  getAllUsers,
  updateUser,
  deleteUser,
  getUserStats,
} from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);

router.get('/sales', getSalesUsers);
router.get('/stats', adminOnly, getUserStats);
// Backward compat: GET /users returns sales list for non-admin queries from legacy clients
router.get('/', (req, res) => {
  if (req.query.all === 'true' && req.user.role === 'admin') return getAllUsers(req, res);
  return getSalesUsers(req, res);
});
router.put('/:id', adminOnly, updateUser);
router.delete('/:id', adminOnly, deleteUser);

export default router;
