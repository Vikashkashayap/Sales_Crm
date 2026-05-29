import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  ensureOnboardingDirs,
  getDocumentByKey,
  ONBOARDING_DIRS,
} from '../utils/onboardingDocuments.js';

ensureOnboardingDirs();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const doc = getDocumentByKey(req.params.key);
    if (!doc) return cb(new Error('Invalid document key'));
    cb(null, ONBOARDING_DIRS[doc.medium]);
  },
  filename(req, file, cb) {
    const doc = getDocumentByKey(req.params.key);
    if (!doc) return cb(new Error('Invalid document key'));
    cb(null, doc.filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

export const uploadOnboardingDocument = [
  upload.single('file'),
  async (req, res) => {
    try {
      const doc = getDocumentByKey(req.params.key);
      if (!doc) return res.status(404).json({ message: 'Document type not found' });
      if (!req.file) return res.status(400).json({ message: 'PDF file is required' });

      res.json({
        message: `${doc.label} uploaded successfully`,
        document: {
          key: doc.key,
          label: doc.label,
          medium: doc.medium,
          filename: doc.filename,
          exists: true,
          size: req.file.size,
          updatedAt: new Date(),
          previewUrl: `/uploads/onboarding/${doc.medium}/${doc.filename}`,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message || 'Upload failed' });
    }
  },
];

export const deleteOnboardingDocument = async (req, res) => {
  try {
    const doc = getDocumentByKey(req.params.key);
    if (!doc) return res.status(404).json({ message: 'Document type not found' });

    const filePath = path.join(ONBOARDING_DIRS[doc.medium], doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: `${doc.label} deleted`, key: doc.key });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Delete failed' });
  }
};
