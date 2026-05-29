import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getSettings,
  updateSettings,
  listOnboardingDocuments,
} from '../controllers/settingsController.js';
import {
  uploadOnboardingDocument,
  deleteOnboardingDocument,
} from '../controllers/onboardingDocumentController.js';

const router = express.Router();

router.use(protect);

router.get('/', getSettings);
router.patch('/', adminOnly, updateSettings);

router.get('/onboarding-documents', adminOnly, listOnboardingDocuments);
router.post('/onboarding-documents/:key/upload', adminOnly, uploadOnboardingDocument);
router.delete('/onboarding-documents/:key', adminOnly, deleteOnboardingDocument);

export default router;
