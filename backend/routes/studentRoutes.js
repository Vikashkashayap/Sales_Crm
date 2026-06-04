import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getStudents,
  getStudentById,
  getStudentStats,
  getRegisteredLeadIds,
  getStudentByLeadId,
  getPendingApprovals,
  getMyPendingSubmissions,
  approveStudent,
  rejectStudent,
  createStudent,
  updateStudent,
  deleteStudent,
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
router.get('/pending-approvals', adminOnly, getPendingApprovals);
router.get('/my-pending', getMyPendingSubmissions);
router.get('/by-lead/:leadId', getStudentByLeadId);
router.get('/', getStudents);
router.post('/:id/approve', adminOnly, approveStudent);
router.post('/:id/reject', adminOnly, rejectStudent);
router.get('/:id/welcome-kit/documents', getStudentWelcomeKitDocuments);
router.get('/:id/welcome-kit/download', downloadStudentWelcomeKit);
router.post('/:id/resend-welcome', resendWelcomeEmail);
router.get('/:id', getStudentById);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', adminOnly, deleteStudent);

export default router;
