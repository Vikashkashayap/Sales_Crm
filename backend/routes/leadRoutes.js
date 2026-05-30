import express from 'express';
import multer from 'multer';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignLead,
  bulkAssignLeads,
  bulkDeleteLeads,
  uploadExcel,
  uploadPastedLeads,
  checkDuplicates,
  getLeadHistory,
  exportLeads,
} from '../controllers/leadController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.get('/export', adminOnly, exportLeads);
router.get('/check-duplicate', checkDuplicates);
router.post('/upload-excel', adminOnly, upload.single('file'), uploadExcel);
router.post('/upload-paste', adminOnly, uploadPastedLeads);
router.put('/assign/:id', assignLead);
router.post('/bulk-assign', bulkAssignLeads);
router.post('/bulk-delete', adminOnly, bulkDeleteLeads);
router.get('/:id/history', getLeadHistory);
router.get('/:id', getLeadById);
router.post('/', createLead);
router.get('/', getLeads);
router.put('/:id', updateLead);
router.delete('/:id', adminOnly, deleteLead);

export default router;
