import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const MATERIALS_DIR = path.join(__dirname, '..', 'uploads', 'materials');

export function ensureMaterialsDir() {
  if (!fs.existsSync(MATERIALS_DIR)) {
    fs.mkdirSync(MATERIALS_DIR, { recursive: true });
  }
}

ensureMaterialsDir();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureMaterialsDir();
    cb(null, MATERIALS_DIR);
  },
  filename(_req, file, cb) {
    const safeBase = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 80);
    const unique = `${Date.now()}-${safeBase}.pdf`;
    cb(null, unique);
  },
});

export const materialUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      path.extname(file.originalname || '').toLowerCase() === '.pdf';
    if (!isPdf) {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
});

export function materialPublicUrl(filename) {
  return `/uploads/materials/${filename}`;
}

export function materialDiskPath(pdfUrl) {
  if (!pdfUrl) return null;
  const filename = path.basename(pdfUrl);
  return path.join(MATERIALS_DIR, filename);
}
