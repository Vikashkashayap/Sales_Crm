import express from 'express';
import multer from 'multer';
import {
  createMaterial,
  deleteMaterial,
  listMaterials,
  updateMaterialStatus,
} from '../controllers/materialController.js';
import {
  clearAllRecipients,
  createRecipientManual,
  deleteRecipient,
  getRecipientsStats,
  listRecipients,
  uploadRecipientsExcel,
  uploadRecipientsPaste,
} from '../controllers/marketingRecipientController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { materialUpload } from '../utils/materialUpload.js';

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const name = (file.originalname || '').toLowerCase();
    if (name.endsWith('.xlsx') || file.mimetype.includes('spreadsheet')) {
      return cb(null, true);
    }
    cb(new Error('Only Excel (.xlsx) files are allowed'));
  },
});

const router = express.Router();

router.use(protect, adminOnly);

router.get('/recipients/stats', getRecipientsStats);
router.get('/recipients', listRecipients);
router.post('/recipients', createRecipientManual);
router.post('/recipients/upload-excel', excelUpload.single('file'), uploadRecipientsExcel);
router.post('/recipients/upload-paste', uploadRecipientsPaste);
router.delete('/recipients/clear', clearAllRecipients);
router.delete('/recipients/:id', deleteRecipient);

router.get('/', listMaterials);
router.post('/', (req, res, next) => {
  materialUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    next();
  });
}, createMaterial);
router.patch('/:id', updateMaterialStatus);
router.delete('/:id', deleteMaterial);

export default router;
