import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getStudents,
  getStudentById,
  getStudentStats,
  getRegisteredLeadIds,
  getStudentByLeadId,
  createStudent,
  updateStudent,
} from '../controllers/studentController.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getStudentStats);
router.get('/registered-lead-ids', getRegisteredLeadIds);
router.get('/by-lead/:leadId', getStudentByLeadId);
router.get('/', getStudents);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.put('/:id', updateStudent);

export default router;
