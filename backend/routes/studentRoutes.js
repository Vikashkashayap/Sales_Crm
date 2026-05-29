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
  resendWelcomeEmail,
} from '../controllers/studentController.js';
import {
  getStudentWelcomeKitDocuments,
  downloadStudentWelcomeKit,
} from '../controllers/welcomeKitController.js';

const router = express.Router();

router.use(protect);

router.get('/stats', getStudentStats);
router.get('/registered-lead-ids', getRegisteredLeadIds);
router.get('/by-lead/:leadId', getStudentByLeadId);
router.get('/', getStudents);
router.get('/:id/welcome-kit/documents', getStudentWelcomeKitDocuments);
router.get('/:id/welcome-kit/download', downloadStudentWelcomeKit);
router.post('/:id/resend-welcome', resendWelcomeEmail);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.put('/:id', updateStudent);

export default router;
